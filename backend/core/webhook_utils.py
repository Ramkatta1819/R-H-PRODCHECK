"""
Async webhook dispatcher for HCM push notifications.
Fires an HTTP POST to the registered webhook_url on an API key
whenever a shift roster or core entity event occurs.
"""
import json
import threading
import hashlib
import hmac
import time
import uuid
import requests
from django.utils import timezone


def _build_signature(payload_str: str, secret: str) -> str:
    """HMAC-SHA256 signature so receiving apps can verify authenticity."""
    return hmac.new(
        secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()


def _dispatch(webhook_url: str, event: str, payload: dict, api_key_id: int):
    """Blocking send — called in a daemon thread."""
    from django.db import connection
    connection.close()
    from core.models import APIKey, APIKeyUsageLog  # local import to avoid circular deps
    from django.conf import settings
    try:
        api_key = APIKey.objects.get(id=api_key_id)
    except Exception as err:
        print(f"[Webhook Error fetching key {api_key_id}]: {err}")
        return

    # SCM Webhook requirements config
    event_id = str(uuid.uuid4())
    timestamp = str(int(time.time()))

    from django.core.cache import cache
    cache_key = f"hcm_webhook_seq_{api_key_id}"
    sequence = cache.get(cache_key)
    if not sequence:
        sequence = 1

    # Build SCM standard envelope body
    # According to SCM spec, "event", "event_id", "sequence" are required.
    # The record can be at top level or under "data".
    body = {
        "event": event,
        "event_id": event_id,
        "sequence": sequence,
        "event_type": event,
        "occurred_at": timezone.now().isoformat() + "Z",
        "entity": event.split('.')[0] if '.' in event else 'unknown',
        "entity_id": payload.get('id') or payload.get('employee_id') or payload.get('position_id'),
        "data": payload,
        "changes": {},
        "reason": "system_sync",
        "actor": {
            "id": 1,
            "name": "System"
        }
    }

    # Page 1 of SCM Webhook Spec: "<the record> The entity itself, either at the top level or under data. Both shapes are read."
    # Unpack payload keys into root if not already defined so receivers expecting top-level fields find them immediately:
    if isinstance(payload, dict):
        for k, v in payload.items():
            if k not in body:
                body[k] = v

    body_str = json.dumps(body, default=str)

    # Determine signing secret:
    # 1. Custom webhook_secret on APIKey (e.g. SCM signing secret)
    # 2. SCM_WEBHOOK_SECRET in settings / .env
    # 3. Fallback to api_key.key
    secret = (getattr(api_key, 'webhook_secret', None) or '').strip()
    if not secret:
        secret = (getattr(settings, 'SCM_WEBHOOK_SECRET', None) or api_key.key).strip()

    # Determine external X-API-Key:
    # 1. Custom webhook_api_key configured on the APIKey via UI
    # 2. SCM_CLIENT_API_KEY / SCM_API_KEY in settings / .env
    # 3. Fallback to api_key.key
    x_api_key = (getattr(api_key, 'webhook_api_key', None) or '').strip()
    if not x_api_key:
        x_api_key = (getattr(settings, 'SCM_CLIENT_API_KEY', None) or getattr(settings, 'SCM_API_KEY', None) or api_key.key).strip()

    # Compute SCM HMAC-SHA256 signature: HMAC-SHA256(secret, "<X-Webhook-Timestamp>.<raw request body>")
    signature_base = f"{timestamp}.{body_str}"
    signature = hmac.new(
        secret.encode('utf-8'),
        signature_base.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Progressive backoff schedule: 30s, 2m, 10m, 1h, 6h, then hourly up to 24h (§7.6)
    delays = [30, 120, 600, 3600, 21600] + [3600] * 18
    max_retries = len(delays)
    status_code = None

    for attempt in range(max_retries):
        delivery_id = str(uuid.uuid4())
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": x_api_key,
            "X-Webhook-Signature": f"sha256={signature}",
            "X-Webhook-Timestamp": timestamp,
            "X-HCM-Event-Id": event_id,
            "X-HCM-Event-Type": event,
            "X-HCM-Delivery-Id": delivery_id,
            "X-HCM-Timestamp": timestamp,
            "X-HCM-Signature": f"sha256={signature}",
            "X-HCM-Attempt": str(attempt + 1),
            "User-Agent": "HCM-Webhook-Engine/1.0",
        }

        try:
            resp = requests.post(
                webhook_url,
                data=body_str,
                headers=headers,
                timeout=6,
            )
            status_code = resp.status_code

            # Handle SCM Sequence Gap / Conflict (409) with auto-resync
            if status_code == 409 and ('expected' in resp.text.lower() or 'sequence' in resp.text.lower()):
                import re
                m = re.search(r'expected\s+(\d+)', resp.text)
                if m:
                    expected_seq = int(m.group(1))
                    print(f"[Webhook Sequence Sync] Key {api_key_id} adjusting sequence from {sequence} to {expected_seq}")
                    sequence = expected_seq
                    body["sequence"] = sequence
                    body_str = json.dumps(body, default=str)
                    signature_base = f"{timestamp}.{body_str}"
                    signature = hmac.new(secret.encode('utf-8'), signature_base.encode('utf-8'), hashlib.sha256).hexdigest()
                    headers["X-Webhook-Signature"] = f"sha256={signature}"
                    headers["X-HCM-Signature"] = f"sha256={signature}"
                    
                    resp = requests.post(webhook_url, data=body_str, headers=headers, timeout=6)
                    status_code = resp.status_code

            if status_code in [200, 201, 202, 204]:
                cache.set(cache_key, sequence + 1, timeout=86400 * 60)
                print(f"[Webhook] [OK] {event} -> {webhook_url} [{resp.status_code}]")
                try:
                    APIKeyUsageLog.objects.create(
                        api_key=api_key,
                        endpoint=f"[WEBHOOK {event}] {webhook_url}",
                        method="POST",
                        status_code=status_code,
                        user_agent="HCM-Webhook-Engine/1.0",
                        payload=body_str
                    )
                except Exception:
                    pass
                break
            else:
                resp.raise_for_status()
        except requests.RequestException as e:
            if hasattr(e, 'response') and getattr(e, 'response', None) is not None:
                status_code = e.response.status_code
            else:
                status_code = 504
            print(f"[Webhook] [FAIL] Attempt {attempt + 1}/{max_retries} failed for {event} -> {webhook_url}: {e}")
            if attempt == 0:
                try:
                    APIKeyUsageLog.objects.create(
                        api_key=api_key,
                        endpoint=f"[WEBHOOK {event}] {webhook_url}",
                        method="POST",
                        status_code=status_code or 504,
                        user_agent="HCM-Webhook-Engine/1.0",
                        payload=body_str
                    )
                except Exception:
                    pass
            if attempt < max_retries - 1:
                time.sleep(delays[attempt])


def is_in_api_key_scope(api_key, payload, event: str = None) -> bool:
    """Validate if the payload is within the allowed scope of the API key."""
    scope = api_key.scope or {}
    scope_type = scope.get('type', 'GLOBAL')
    if not scope or scope_type == 'GLOBAL' or scope.get('locationGlobal') is True:
        return True

    entities = scope.get('entities', [])
    if not entities:
        return True

    grouped = {}
    for ent in entities:
        et = ent.get('type')
        eid = str(ent.get('id'))
        if et and eid:
            if et not in grouped:
                grouped[et] = set()
            grouped[et].add(eid)

    from core.models import Employee, Position, Office, Department, Section, Role, Project
    
    # Helper to check if a position matches the grouped scopes
    def position_matches(pos):
        if not pos:
            return False

        if 'OFFICE' in grouped and hasattr(pos, 'office_id') and str(pos.office_id) in grouped['OFFICE']:
            return True
        if 'DEPARTMENT' in grouped and hasattr(pos, 'department_id') and str(pos.department_id) in grouped['DEPARTMENT']:
            return True
        if 'SECTION' in grouped and hasattr(pos, 'section_id') and str(pos.section_id) in grouped['SECTION']:
            return True
        if 'ROLE' in grouped and hasattr(pos, 'role_id') and str(pos.role_id) in grouped['ROLE']:
            return True
        if 'LEVEL' in grouped and hasattr(pos, 'level_id') and str(pos.level_id) in grouped['LEVEL']:
            return True
        if 'PROJECT' in grouped:
            # Direct project on position
            if hasattr(pos, 'project_id') and pos.project_id and str(pos.project_id) in grouped['PROJECT']:
                return True
            # Section project
            if hasattr(pos, 'section') and pos.section and getattr(pos.section, 'project_id', None) and str(pos.section.project_id) in grouped['PROJECT']:
                return True
            # Department project
            if hasattr(pos, 'department') and pos.department and getattr(pos.department, 'project_id', None) and str(pos.department.project_id) in grouped['PROJECT']:
                return True
            # Office projects (M2M)
            if hasattr(pos, 'office') and pos.office and hasattr(pos.office, 'projects'):
                try:
                    if pos.office.projects.filter(id__in=grouped['PROJECT']).exists():
                        return True
                except Exception:
                    for p in pos.office.projects.all():
                        if str(p.id) in grouped['PROJECT']:
                            return True
        off = getattr(pos, 'office', None)
        if off:
            if 'CLUSTER' in grouped:
                c_id = getattr(off, 'cluster_id', None)
                if c_id and str(c_id) in grouped['CLUSTER']:
                    return True
                if hasattr(off, 'cluster') and off.cluster and str(getattr(off.cluster, 'id', '')) in grouped['CLUSTER']:
                    return True

            if 'MANDAL' in grouped:
                m_id = getattr(off, 'mandal_id', None)
                m_name = (getattr(off, 'mandal_name', None) or '').strip().lower()
                if m_id and str(m_id) in grouped['MANDAL']:
                    return True
                for gid in grouped['MANDAL']:
                    if str(gid).lower() == m_name:
                        return True

            if 'DISTRICT' in grouped:
                d_id = getattr(off, 'district_id', None)
                d_name = (getattr(off, 'district_name', None) or '').strip().lower()
                if d_id and str(d_id) in grouped['DISTRICT']:
                    return True
                for gid in grouped['DISTRICT']:
                    if str(gid).lower() == d_name:
                        return True

            if 'STATE' in grouped:
                s_id = getattr(off, 'state_id', None)
                s_name = (getattr(off, 'state_name', None) or '').strip().lower()
                if s_id and str(s_id) in grouped['STATE']:
                    return True
                for gid in grouped['STATE']:
                    if str(gid).lower() == s_name:
                        return True
        return False

    # 1. Project Events
    if event and event.startswith('project.'):
        proj_id = str(payload.get('id') or '')
        if 'PROJECT' in grouped:
            return proj_id in grouped['PROJECT']
        return True

    # 2. Office Events
    if event and event.startswith('office.'):
        off_id = str(payload.get('id') or '')
        if 'OFFICE' in grouped and off_id in grouped['OFFICE']:
            return True
        if 'PROJECT' in grouped and off_id:
            try:
                return Office.objects.filter(id=off_id, projects__id__in=grouped['PROJECT']).exists()
            except Exception:
                pass
        return False if 'OFFICE' in grouped or 'PROJECT' in grouped else True

    # 3. Department Events
    if event and event.startswith('department.'):
        dept_id = str(payload.get('id') or '')
        if 'DEPARTMENT' in grouped and dept_id in grouped['DEPARTMENT']:
            return True
        if 'PROJECT' in grouped:
            proj_hint = str(payload.get('project_id') or (payload.get('project') or {}).get('id') or '')
            if proj_hint and proj_hint in grouped['PROJECT']:
                return True
            if dept_id:
                try:
                    if Department.objects.filter(id=dept_id, project_id__in=grouped['PROJECT']).exists():
                        return True
                    if Department.objects.filter(id=dept_id, office__projects__id__in=grouped['PROJECT']).exists():
                        return True
                except Exception:
                    pass
        return False if 'DEPARTMENT' in grouped or 'PROJECT' in grouped else True

    # 4. Section Events
    if event and event.startswith('section.'):
        sec_id = str(payload.get('id') or '')
        if 'SECTION' in grouped and sec_id in grouped['SECTION']:
            return True
        if 'PROJECT' in grouped:
            proj_hint = str(payload.get('project_id') or (payload.get('project') or {}).get('id') or '')
            if proj_hint and proj_hint in grouped['PROJECT']:
                return True
            if sec_id:
                try:
                    if Section.objects.filter(id=sec_id, project_id__in=grouped['PROJECT']).exists():
                        return True
                    if Section.objects.filter(id=sec_id, department__project_id__in=grouped['PROJECT']).exists():
                        return True
                    if Section.objects.filter(id=sec_id, department__office__projects__id__in=grouped['PROJECT']).exists():
                        return True
                except Exception:
                    pass
        return False if 'SECTION' in grouped or 'PROJECT' in grouped else True

    # 5. Role Events
    if event and event.startswith('role.'):
        role_id = str(payload.get('id') or '')
        if 'ROLE' in grouped:
            return role_id in grouped['ROLE']
        return True

    # 6. Position Events
    if event and event.startswith('position.'):
        pos_id = payload.get('id')
        if pos_id:
            if 'POSITION' in grouped and str(pos_id) in grouped['POSITION']:
                return True
            try:
                pos = Position.objects.prefetch_related('office', 'department', 'section').get(id=pos_id)
                return position_matches(pos)
            except Position.DoesNotExist:
                pass
        return False

    # 7. Position Assignment Events
    if event and event.startswith('position_assignment.'):
        pos_id = payload.get('position_id')
        if pos_id:
            if 'POSITION' in grouped and str(pos_id) in grouped['POSITION']:
                return True
            try:
                pos = Position.objects.prefetch_related('office', 'department', 'section').get(id=pos_id)
                if position_matches(pos):
                    return True
            except Position.DoesNotExist:
                pass
        emp_id = payload.get('employee_id')
        if emp_id and 'EMPLOYEE' in grouped and str(emp_id) in grouped['EMPLOYEE']:
            return True
        return False

    # 8. Employee Events & Shift Events
    emp_id = payload.get('employee_id') or payload.get('id')
    employee = None
    if emp_id:
        try:
            employee = Employee.objects.prefetch_related('positions__office', 'positions__department', 'positions__section').get(id=emp_id)
        except Employee.DoesNotExist:
            pass

    if employee:
        if 'EMPLOYEE' in grouped and str(employee.id) in grouped['EMPLOYEE']:
            return True

        positions = list(employee.positions.all())
        if positions:
            for pos in positions:
                if 'POSITION' in grouped and str(pos.id) in grouped['POSITION']:
                    return True
                if position_matches(pos):
                    return True
            return False

    # Check if payload provided any position/office hint (e.g. newly created employee or unpersisted M2M payload):
    pos_candidates = []
    pos_hint = payload.get('position')
    if isinstance(pos_hint, dict) and pos_hint.get('id'):
        pos_candidates.append(pos_hint['id'])
    elif isinstance(pos_hint, (int, str)) and str(pos_hint).isdigit():
        pos_candidates.append(int(pos_hint))

    raw_positions = payload.get('positions') or payload.get('positions_details')
    if isinstance(raw_positions, list):
        for p_item in raw_positions:
            if isinstance(p_item, dict) and p_item.get('id'):
                pos_candidates.append(p_item['id'])
            elif isinstance(p_item, (int, str)) and str(p_item).isdigit():
                pos_candidates.append(int(p_item))

    prim_pos = payload.get('primary_position')
    if isinstance(prim_pos, dict) and prim_pos.get('id'):
        pos_candidates.append(prim_pos['id'])
    elif isinstance(prim_pos, (int, str)) and str(prim_pos).isdigit():
        pos_candidates.append(int(prim_pos))

    if pos_candidates:
        matched_positions = Position.objects.filter(id__in=pos_candidates).prefetch_related('office', 'department', 'section')
        for p in matched_positions:
            if 'POSITION' in grouped and str(p.id) in grouped['POSITION']:
                return True
            if position_matches(p):
                return True

    # Also check if payload explicitly contains scoped project/office/department
    if 'PROJECT' in grouped:
        proj_val = payload.get('project_id') or (payload.get('project') if isinstance(payload.get('project'), dict) else {}).get('id')
        if proj_val and str(proj_val) in grouped['PROJECT']:
            return True

    if 'OFFICE' in grouped:
        off_val = payload.get('office_id') or (payload.get('office') if isinstance(payload.get('office'), dict) else {}).get('id')
        if off_val and str(off_val) in grouped['OFFICE']:
            return True

    if 'DEPARTMENT' in grouped:
        dept_val = payload.get('department_id') or (payload.get('department') if isinstance(payload.get('department'), dict) else {}).get('id')
        if dept_val and str(dept_val) in grouped['DEPARTMENT']:
            return True

    # If no positions match the scoped project/department, DO NOT fire to this scoped key
    return False


def _dispatch_direct(webhook_url: str, event: str, payload: dict):
    """Direct send for global DEFAULT_WEBHOOK_URL configured in settings/.env."""
    event_id = str(uuid.uuid4())
    timestamp = str(int(time.time()))
    body = {
        "event_id": event_id,
        "event_type": event,
        "occurred_at": timezone.now().isoformat() + "Z",
        "sequence": int(time.time()),
        "entity": event.split('.')[0] if '.' in event else 'unknown',
        "entity_id": payload.get('id') or payload.get('employee_id') or payload.get('position_id'),
        "data": payload,
        "changes": {},
        "reason": "system_sync",
        "actor": {
            "id": 1,
            "name": "System"
        }
    }
    body_str = json.dumps(body, default=str)
    headers = {
        "Content-Type": "application/json",
        "X-HCM-Event-Id": event_id,
        "X-HCM-Event-Type": event,
        "X-HCM-Delivery-Id": str(uuid.uuid4()),
        "X-HCM-Timestamp": timestamp,
        "User-Agent": "HCM-Webhook/1.0",
    }
    try:
        resp = requests.post(webhook_url, data=body_str, headers=headers, timeout=10)
        print(f"[Webhook Direct] ✓ {event} → {webhook_url} [{resp.status_code}]")
    except Exception as e:
        print(f"[Webhook Direct] ✗ Failed for {event} → {webhook_url}: {e}")


def fire_shift_webhook(event: str, payload: dict):
    """
    Find all active API keys that have a webhook_url configured and
    include `event` in their webhook_events list, then dispatch asynchronously.
    Also supports global DEFAULT_WEBHOOK_URL from settings/.env.
    Flushes cache to guarantee zero-latency updated data on API reads.
    """
    from core.models import APIKey  # local import
    from django.conf import settings
    from django.core.cache import cache

    # Instantly invalidate cache on roster/shift/entity changes
    try:
        cache.clear()
    except Exception:
        pass

    keys = list(APIKey.objects.filter(
        is_active=True,
        webhook_url__isnull=False,
    ).exclude(webhook_url=''))
    print(f'[DEBUG Webhook] Event: {event}, Matching Keys Found: {len(keys)}')

    default_url = getattr(settings, 'DEFAULT_WEBHOOK_URL', None) or getattr(settings, 'WEBHOOK_URL', None)

    # If no custom API keys with webhook URLs are registered, but a DEFAULT_WEBHOOK_URL is set in .env
    if not keys and default_url:
        t = threading.Thread(
            target=_dispatch_direct,
            args=(default_url, event, payload),
            daemon=True,
        )
        t.start()
        return

    for api_key in keys:
        subscribed = api_key.webhook_events
        if subscribed is not None and event not in subscribed:
            print(f"[DEBUG Key {api_key.id}] Skipped event mismatch: {event} not in {subscribed}")
            try:
                from core.models import APIKeyUsageLog
                APIKeyUsageLog.objects.create(
                    api_key=api_key,
                    endpoint=f"[WEBHOOK {event}] {api_key.webhook_url}",
                    method="POST",
                    status_code=412,
                    user_agent=f"HCM-Webhook-Engine/1.0 (Skipped: Event '{event}' not subscribed)",
                    payload=json.dumps(payload, default=str)[:1000]
                )
            except Exception:
                pass
            continue

        if not is_in_api_key_scope(api_key, payload, event):
            print(f"[DEBUG Key {api_key.id}] Skipped scope mismatch")
            try:
                from core.models import APIKeyUsageLog
                APIKeyUsageLog.objects.create(
                    api_key=api_key,
                    endpoint=f"[WEBHOOK {event}] {api_key.webhook_url}",
                    method="POST",
                    status_code=412,
                    user_agent=f"HCM-Webhook-Engine/1.0 (Skipped: Scope Mismatch - entity outside allowed scope)",
                    payload=json.dumps(payload, default=str)[:1000]
                )
            except Exception:
                pass
            continue

        urls = [u.strip() for u in api_key.webhook_url.split(',') if u.strip()]
        for target_url in urls:
            print(f"[DEBUG Key {api_key.id}] Dispatching thread to {target_url}")
            t = threading.Thread(
                target=_dispatch,
                args=(target_url, event, payload, api_key.id),
                daemon=True,
            )
            t.start()

