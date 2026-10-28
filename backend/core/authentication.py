from rest_framework import authentication, exceptions
from .models import APIKey, APIKeyUsageLog
from django.utils import timezone
from django.core.cache import cache
import time
import threading

class APIKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        # 1. Check headers
        key = request.headers.get('X-Api-Key') or request.META.get('HTTP_X_API_KEY')
        if not key:
            # Check Authorization: Api-Key <key>
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Api-Key '):
                key = auth_header.split(' ')[1]
        
        if not key:
            return None

        # 2. Validate Key
        try:
            api_key = APIKey.objects.get(key=key)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid API Key')

        if not api_key.is_active:
            raise exceptions.AuthenticationFailed('API Key is revoked')

        if api_key.valid_until and api_key.valid_until < timezone.now().date():
            raise exceptions.AuthenticationFailed('API Key has expired')

        # 3. Validate Client IP Restriction (if configured)
        client_ip = request.META.get('REMOTE_ADDR')
        if api_key.allowed_ips:
            allowed = [ip.strip() for ip in api_key.allowed_ips.split(',') if ip.strip()]
            if allowed and client_ip not in allowed and '127.0.0.1' not in allowed:
                raise exceptions.AuthenticationFailed(f"Client IP '{client_ip}' is not authorized for this API key.")

        # 4. Enforce Dynamic Rate Limiting (Requests Per Minute)
        if api_key.rate_limit and api_key.rate_limit > 0:
            minute_bucket = int(time.time() // 60)
            cache_key = f"hcm_rate_limit_{api_key.id}_{minute_bucket}"
            try:
                current_hits = cache.get(cache_key, 0)
                if current_hits >= api_key.rate_limit:
                    raise exceptions.Throttled(
                        detail=f"Rate limit exceeded. Maximum {api_key.rate_limit} requests per minute allowed."
                    )
                cache.set(cache_key, current_hits + 1, timeout=70)
            except exceptions.Throttled:
                raise
            except Exception:
                pass

        # 5. Non-blocking async logging and stats update
        def _record_usage(key_id, remote_addr, path, method, user_agent):
            try:
                from django.db import models
                APIKey.objects.filter(id=key_id).update(
                    usage_count=models.F('usage_count') + 1,
                    last_used=timezone.now()
                )
                APIKeyUsageLog.objects.create(
                    api_key_id=key_id,
                    ip_address=remote_addr,
                    endpoint=path,
                    method=method,
                    user_agent=user_agent
                )
            except Exception:
                pass

        threading.Thread(
            target=_record_usage,
            args=(
                api_key.id,
                client_ip,
                request.path,
                request.method,
                request.META.get('HTTP_USER_AGENT')
            ),
            daemon=True
        ).start()

        # 6. Return User and Key
        return (api_key.user, api_key)

