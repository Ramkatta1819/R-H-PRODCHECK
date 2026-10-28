from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
import datetime

from core.models import (
    Employee, Position, Office, Department, Section, Role, PositionLevel, Project, Facility,
    PositionAssignment, OrganizationLevel
)
from core.authentication import APIKeyAuthentication
from core.scm_v1.serializers import (
    SCMEmployeeSerializer, SCMPositionSerializer, SCMOfficeSerializer,
    SCMDepartmentSerializer, SCMSectionSerializer, SCMRoleSerializer,
    SCMPositionLevelSerializer, SCMProjectSerializer, SCMFacilitySerializer,
    SCMPositionAssignmentSerializer, SCMOrganizationLevelSerializer
)


class BaseSCMViewSet(viewsets.ViewSet):
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Store X-Request-Id if provided
        self.request_id = request.headers.get('X-Request-Id') or request.META.get('HTTP_X_REQUEST_ID')

    def finalize_response(self, request, response, *args, **kwargs):
        res = super().finalize_response(request, response, *args, **kwargs)
        if hasattr(self, 'request_id') and self.request_id:
            res['X-Request-Id'] = self.request_id
        return res

    def single_response(self, data, status_code=200):
        return Response({'data': data}, status=status_code)

    def paginated_response(self, data, total, limit, offset, next_url=None):
        return Response({
            'count': total,
            'next': next_url,
            'results': data,
            'data': data,
            'page': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'next': next_url
            }
        }, status=200)

    def error_response(self, code, message, status_code=400):
        return Response({
            'error': {
                'code': code,
                'message': message
            }
        }, status=status_code)


class SCMEmployeeViewSet(BaseSCMViewSet):
    """
    SCM Employee API Suite (P0)
    Excludes all sensitive PII, salary, bank, health, DOB, PAN, Aadhaar, gender, photo.
    """

    def list(self, request):
        qs = Employee.objects.all()

        # Filtering
        status_param = request.query_params.get('status', 'active')
        if status_param == 'active':
            qs = qs.filter(status__in=['Active', 'active'])
        elif status_param == 'inactive':
            qs = qs.filter(status__in=['Inactive', 'inactive', 'Terminated', 'Resigned'])

        office_id = request.query_params.get('office_id')
        if office_id:
            qs = qs.filter(office_id=office_id)

        dept_id = request.query_params.get('department_id')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        proj_id = request.query_params.get('project_id')
        if proj_id:
            qs = qs.filter(project_id=proj_id)

        role_id = request.query_params.get('role_id')
        if role_id:
            qs = qs.filter(Q(position__role_id=role_id) | Q(positions__role_id=role_id)).distinct()

        pos_id = request.query_params.get('position_id')
        if pos_id:
            qs = qs.filter(positions__id=pos_id).distinct()

        q_search = request.query_params.get('q')
        if q_search:
            qs = qs.filter(
                Q(name__icontains=q_search) |
                Q(employee_code__icontains=q_search) |
                Q(email__icontains=q_search)
            )

        ids_param = request.query_params.get('ids')
        if ids_param:
            id_list = [int(i.strip()) for i in ids_param.split(',') if i.strip().isdigit()]
            qs = qs.filter(id__in=id_list)

        # Cross-System IN (...) Joins optimization
        ids_only = request.query_params.get('ids_only') in ['true', '1']
        if ids_only:
            id_array = list(qs.values_list('id', flat=True)[:20000])
            return self.single_response(id_array)

        # Sorting
        sort = request.query_params.get('sort', 'name')
        if sort in ['name', '-name', 'code', '-code', 'employee_code', '-employee_code', 'created_at', '-created_at']:
            if 'code' in sort:
                sort = sort.replace('code', 'employee_code')
            qs = qs.order_by(sort)
        else:
            qs = qs.order_by('name')

        # Pagination
        try:
            limit = min(500, max(1, int(request.query_params.get('limit', 100))))
            offset = max(0, int(request.query_params.get('offset', 0)))
        except ValueError:
            limit, offset = 100, 0

        total = qs.count()
        page_qs = qs[offset:offset+limit]
        serializer = SCMEmployeeSerializer(page_qs, many=True)

        next_url = None
        if offset + limit < total:
            next_url = f"{request.build_absolute_uri(request.path)}?limit={limit}&offset={offset+limit}"

        return self.paginated_response(serializer.data, total, limit, offset, next_url)

    def retrieve(self, request, pk=None):
        try:
            emp = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No employee with id {pk}', 404)

        serializer = SCMEmployeeSerializer(emp)
        return self.single_response(serializer.data)

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        username = request.query_params.get('username')
        if not username:
            return self.error_response('BAD_REQUEST', 'Missing username query parameter', 400)

        emp = None
        if username.isdigit():
            emp = Employee.objects.filter(id=int(username)).first()
        if not emp:
            emp = Employee.objects.filter(employee_code__iexact=username.strip()).first()
        if not emp:
            emp = Employee.objects.filter(email__iexact=username.strip()).first()

        if not emp:
            return self.error_response('NOT_FOUND', f'No employee found matching username {username}', 404)

        serializer = SCMEmployeeSerializer(emp)
        return self.single_response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-code/(?P<code>[^/.]+)')
    def by_code(self, request, code=None):
        if not code:
            return self.error_response('BAD_REQUEST', 'Missing employee_code', 400)

        emp = Employee.objects.filter(employee_code__iexact=code.strip()).first()
        if not emp:
            return self.error_response('NOT_FOUND', f'No employee found with code {code}', 404)

        serializer = SCMEmployeeSerializer(emp)
        return self.single_response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch(self, request):
        ids = request.data.get('ids', [])
        codes = request.data.get('employee_codes', [])

        qs = Employee.objects.none()
        if ids:
            qs = qs | Employee.objects.filter(id__in=ids)
        if codes:
            qs = qs | Employee.objects.filter(employee_code__in=[c.strip() for c in codes])

        found_employees = list(qs.distinct())
        found_ids = {e.id for e in found_employees}
        found_codes = {e.employee_code for e in found_employees if e.employee_code}

        missing_ids = [i for i in ids if i not in found_ids]
        missing_codes = [c for c in codes if c not in found_codes]

        serializer = SCMEmployeeSerializer(found_employees, many=True)
        return Response({
            'data': serializer.data,
            'missing': missing_ids + missing_codes
        }, status=200)

    @action(detail=False, methods=['post'], url_path='resolve-names')
    def resolve_names(self, request):
        ids = request.data.get('ids', [])
        codes = request.data.get('employee_codes', [])

        qs = Employee.objects.none()
        if ids:
            qs = qs | Employee.objects.filter(id__in=ids)
        if codes:
            qs = qs | Employee.objects.filter(employee_code__in=[c.strip() for c in codes])

        res_data = {}
        for emp in qs.distinct():
            item = {
                'name': emp.name,
                'employee_code': emp.employee_code or f"EMP-{emp.id}",
                'status': 'active' if (emp.status or '').upper() == 'ACTIVE' else 'inactive'
            }
            res_data[str(emp.id)] = item
            if emp.employee_code:
                res_data[emp.employee_code] = item

        return self.single_response(res_data)

    @action(detail=True, methods=['get'])
    def context(self, request, pk=None):
        try:
            emp = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No employee with id {pk}', 404)

        emp_data = SCMEmployeeSerializer(emp).data
        positions_qs = emp.positions.all()
        pos_data = SCMPositionSerializer(positions_qs, many=True).data

        active_pos = getattr(emp, 'position', None) or positions_qs.first()
        active_pos_data = SCMPositionSerializer(active_pos).data if active_pos else None

        # Build ancestors
        ancestors = []
        if active_pos:
            curr = active_pos.reporting_to.first() if hasattr(active_pos, 'reporting_to') else None
            depth = 0
            seen = {active_pos.id}
            while curr and depth < 20:
                if curr.id in seen:
                    break
                seen.add(curr.id)
                ancestors.append(SCMPositionSerializer(curr).data)
                curr = curr.reporting_to.first() if hasattr(curr, 'reporting_to') else None
                depth += 1

        # Office path
        office_path = []
        emp_office = active_pos.office if active_pos else None
        if emp_office:
            curr_off = emp_office
            off_seen = set()
            path_rev = []
            while curr_off and curr_off.id not in off_seen:
                off_seen.add(curr_off.id)
                path_rev.append({'id': curr_off.id, 'name': curr_off.name})
                curr_off = curr_off.parent
            office_path = list(reversed(path_rev))

        # Direct reports count
        direct_reports_count = 0
        if active_pos:
            direct_reports_count = Position.objects.filter(reporting_to=active_pos).count()

        return self.single_response({
            'employee': emp_data,
            'positions': pos_data,
            'active_position': active_pos_data,
            'ancestors': ancestors,
            'office_path': office_path,
            'direct_reports_count': direct_reports_count
        })

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))

        if not q:
            return self.single_response([])

        qs = Employee.objects.filter(
            Q(name__icontains=q) |
            Q(employee_code__icontains=q) |
            Q(email__icontains=q)
        ).filter(status__in=['Active', 'active'])[:limit]

        res = []
        for emp in qs:
            primary_pos = getattr(emp, 'position', None) or emp.positions.first()
            office = primary_pos.office if (primary_pos and getattr(primary_pos, 'office', None)) else None
            res.append({
                'id': emp.id,
                'name': emp.name,
                'employee_code': emp.employee_code or f"EMP-{emp.id}",
                'status': 'active',
                'office': {'name': office.name} if office else None,
                'primary_position': {'name': primary_pos.name} if primary_pos else None
            })
        return self.single_response(res)

    @action(detail=True, methods=['get'])
    def reports(self, request, pk=None):
        try:
            emp = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No employee with id {pk}', 404)

        depth_param = request.query_params.get('depth', 'direct')
        ids_only = request.query_params.get('ids_only') in ['true', '1']

        positions = emp.positions.all()
        pos_ids = set(positions.values_list('id', flat=True))
        primary_p = getattr(emp, 'position', None)
        if primary_p:
            pos_ids.add(primary_p.id)

        if not pos_ids:
            return self.single_response([]) if ids_only else self.single_response([])

        report_emp_ids = set()
        if depth_param == 'direct':
            child_positions = Position.objects.filter(reporting_to__in=pos_ids)
            for cpos in child_positions:
                for remp in cpos.employees.all():
                    report_emp_ids.add(remp.id)
        else: # depth == 'all'
            visited_pos = set(pos_ids)
            frontier = set(pos_ids)
            while frontier:
                children = set(Position.objects.filter(reporting_to__in=frontier).values_list('id', flat=True))
                new_children = children - visited_pos
                if not new_children:
                    break
                visited_pos.update(new_children)
                frontier = new_children

            child_positions = Position.objects.filter(id__in=visited_pos - pos_ids)
            for cpos in child_positions:
                for remp in cpos.employees.all():
                    report_emp_ids.add(remp.id)

        if ids_only:
            return self.single_response(list(report_emp_ids))

        report_emps = Employee.objects.filter(id__in=report_emp_ids)
        serializer = SCMEmployeeSerializer(report_emps, many=True)
        return self.single_response(serializer.data)

    @action(detail=True, methods=['get'])
    def positions(self, request, pk=None):
        try:
            emp = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No employee with id {pk}', 404)
        pos_qs = emp.positions.all()
        serializer = SCMPositionSerializer(pos_qs, many=True)
        return self.single_response(serializer.data)

    @action(detail=True, methods=['get'], url_path='manager-chain')
    def manager_chain(self, request, pk=None):
        try:
            emp = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No employee with id {pk}', 404)
        primary_pos = emp.positions.first()
        if not primary_pos:
            return self.single_response([])
        ancestors = []
        curr = primary_pos.reporting_to.first() if hasattr(primary_pos, 'reporting_to') else None
        depth = 0
        seen = {primary_pos.id}
        max_depth = int(request.query_params.get('max_depth', 20))
        include_holders = request.query_params.get('include_holders') in ['true', '1']
        while curr and depth < max_depth:
            if curr.id in seen:
                return Response({'data': ancestors, 'warning': f'cycle_detected_at_position_id: {curr.id}'}, status=200)
            seen.add(curr.id)
            pos_data = SCMPositionSerializer(curr).data
            if include_holders:
                holders = curr.employees.filter(status__in=['Active', 'active'])
                pos_data['holders'] = SCMEmployeeSerializer(holders, many=True).data
            ancestors.append(pos_data)
            curr = curr.reporting_to.first() if hasattr(curr, 'reporting_to') else None
            depth += 1
        return self.single_response(ancestors)


class SCMPositionViewSet(BaseSCMViewSet):
    """
    SCM Position API Suite (P0)
    Org chart hierarchy, ancestor reporting chains, cycle detection, seat holders.
    """

    def list(self, request):
        qs = Position.objects.all()

        status_param = request.query_params.get('status', 'active')
        if status_param == 'active':
            qs = qs.filter(status__in=['Active', 'active'])
        elif status_param == 'inactive':
            qs = qs.filter(status__in=['Inactive', 'inactive'])

        role_id = request.query_params.get('role_id')
        if role_id:
            qs = qs.filter(role_id=role_id)

        proj_id = request.query_params.get('project_id')
        if proj_id:
            qs = qs.filter(project_id=proj_id)

        office_id = request.query_params.get('office_id')
        if office_id:
            qs = qs.filter(office_id=office_id)

        dept_id = request.query_params.get('department_id')
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        q_search = request.query_params.get('q')
        if q_search:
            qs = qs.filter(Q(name__icontains=q_search) | Q(code__icontains=q_search))

        ids_only = request.query_params.get('ids_only') in ['true', '1']
        if ids_only:
            return self.single_response(list(qs.values_list('id', flat=True)[:20000]))

        try:
            limit = min(500, max(1, int(request.query_params.get('limit', 100))))
            offset = max(0, int(request.query_params.get('offset', 0)))
        except ValueError:
            limit, offset = 100, 0

        total = qs.count()
        serializer = SCMPositionSerializer(qs[offset:offset+limit], many=True)
        return self.paginated_response(serializer.data, total, limit, offset)

    def retrieve(self, request, pk=None):
        try:
            pos = Position.objects.get(pk=pk)
        except Position.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position with id {pk}', 404)

        serializer = SCMPositionSerializer(pos)
        return self.single_response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch(self, request):
        ids = request.data.get('ids', [])
        qs = Position.objects.filter(id__in=ids)
        serializer = SCMPositionSerializer(qs, many=True)
        found_ids = set(qs.values_list('id', flat=True))
        missing = [i for i in ids if i not in found_ids]
        return Response({'data': serializer.data, 'missing': missing}, status=200)

    @action(detail=True, methods=['get'])
    def ancestors(self, request, pk=None):
        try:
            pos = Position.objects.get(pk=pk)
        except Position.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position with id {pk}', 404)

        max_depth = min(50, max(1, int(request.query_params.get('max_depth', 20))))
        include_holders = request.query_params.get('include_holders') in ['true', '1']

        ancestors = []
        curr = pos.reporting_to.first() if hasattr(pos, 'reporting_to') else None
        seen = {pos.id}
        depth = 1
        warning = None

        while curr and depth <= max_depth:
            if curr.id in seen:
                warning = f"cycle_detected_at_position_id: {curr.id}"
                break
            seen.add(curr.id)
            parent_pos = curr.reporting_to.first() if hasattr(curr, 'reporting_to') else None

            item = {
                'id': curr.id,
                'name': curr.name,
                'role': {'id': curr.role.id, 'name': curr.role.name} if curr.role else None,
                'parent_position_id': parent_pos.id if parent_pos else None,
                'status': 'active' if getattr(curr, 'status', 'Active') in ['Active', 'active'] else 'inactive',
                'depth': depth
            }
            if include_holders:
                item['holders'] = [{'id': h.id, 'name': h.name, 'employee_code': getattr(h, 'employee_code', f"EMP-{h.id}")} for h in curr.employees.filter(status__in=['Active', 'active'])]

            ancestors.append(item)
            curr = parent_pos
            depth += 1

        res = {'data': ancestors}
        if warning:
            res['warning'] = warning
        return Response(res, status=200)

    @action(detail=True, methods=['get'])
    def descendants(self, request, pk=None):
        try:
            pos = Position.objects.get(pk=pk)
        except Position.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position with id {pk}', 404)

        ids_only = request.query_params.get('ids_only') in ['true', '1']

        visited = {pos.id}
        frontier = {pos.id}
        while frontier:
            children = set(Position.objects.filter(reporting_to__in=frontier).values_list('id', flat=True))
            new_children = children - visited
            if not new_children:
                break
            visited.update(new_children)
            frontier = new_children

        descendant_ids = list(visited - {pos.id})
        if ids_only:
            return self.single_response(descendant_ids)

        desc_qs = Position.objects.filter(id__in=descendant_ids)
        serializer = SCMPositionSerializer(desc_qs, many=True)
        return self.single_response(serializer.data)

    @action(detail=True, methods=['get'])
    def holders(self, request, pk=None):
        try:
            pos = Position.objects.get(pk=pk)
        except Position.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position with id {pk}', 404)
        holders = pos.employees.filter(status__in=['Active', 'active'])
        res = []
        for h in holders:
            res.append({'employee': SCMEmployeeSerializer(h).data, 'assignment': {'is_primary': True, 'status': 'active'}})
        return self.single_response(res)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        try:
            pos = Position.objects.get(pk=pk)
        except Position.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position with id {pk}', 404)
        child_positions = Position.objects.filter(reporting_to=pos)
        return self.single_response(SCMPositionSerializer(child_positions, many=True).data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '')
        limit = int(request.query_params.get('limit', 20))
        office_id = request.query_params.get('office_id')
        project_id = request.query_params.get('project_id')
        role_id = request.query_params.get('role_id')
        status = request.query_params.get('status', 'active')
        qs = Position.objects.all()
        if status == 'active':
            qs = qs.filter(status__in=['Active', 'active'])
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__icontains=q))
        if office_id:
            qs = qs.filter(office_id=office_id)
        if project_id:
            qs = qs.filter(project_id=project_id)
        if role_id:
            qs = qs.filter(role_id=role_id)
        return self.single_response(SCMPositionSerializer(qs[:limit], many=True).data)

    @action(detail=False, methods=['get'])
    def aggregate(self, request):
        from django.db.models import Count
        group_by = request.query_params.get('group_by', 'role')
        project_id = request.query_params.get('project_id')
        status = request.query_params.get('status', 'active')
        qs = Position.objects.all()
        if status == 'active':
            qs = qs.filter(status__in=['Active', 'active'])
        if project_id:
            qs = qs.filter(project_id=project_id)
        if group_by == 'role':
            data = qs.values('role_id', 'role__name').annotate(position_count=Count('id'))
            res = [{'key': {'id': d['role_id'], 'name': d['role__name']}, 'position_count': d['position_count'], 'holder_count': d['position_count']} for d in data]
        elif group_by == 'department':
            data = qs.values('department_id', 'department__name').annotate(position_count=Count('id'))
            res = [{'key': {'id': d['department_id'], 'name': d['department__name']} if d['department_id'] else None, 'position_count': d['position_count'], 'holder_count': d['position_count']} for d in data]
        elif group_by == 'office':
            data = qs.values('office_id', 'office__name').annotate(position_count=Count('id'))
            res = [{'key': {'id': d['office_id'], 'name': d['office__name']} if d['office_id'] else None, 'position_count': d['position_count'], 'holder_count': d['position_count']} for d in data]
        else:
            res = []
        return self.single_response(res)


class SCMRoleViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Role.objects.all()
        proj_id = request.query_params.get('project_id')
        if proj_id:
            qs = qs.filter(positions__project_id=proj_id).distinct()
        serializer = SCMRoleSerializer(qs, many=True)
        return self.single_response(serializer.data)

    @action(detail=True, methods=['get'])
    def positions(self, request, pk=None):
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No role with id {pk}', 404)
        project_id = request.query_params.get('project_id')
        include_holders = request.query_params.get('include_holders') in ['true', '1']
        qs = Position.objects.filter(role=role)
        if project_id:
            qs = qs.filter(project_id=project_id)
        res = []
        for pos in qs:
            item = SCMPositionSerializer(pos).data
            if include_holders:
                item['holders'] = SCMEmployeeSerializer(pos.employees.filter(status__in=['Active', 'active']), many=True).data
            res.append(item)
        return self.single_response(res)


class SCMProjectViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Project.objects.all()
        q = request.query_params.get('q')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__icontains=q))
        include_hc = request.query_params.get('include_headcount') in ['true', '1']
        serializer = SCMProjectSerializer(qs, many=True, context={'include_headcount': include_hc})
        return self.single_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            proj = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No project with id {pk}', 404)
        return self.single_response(SCMProjectSerializer(proj).data)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        try:
            proj = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No project with id {pk}', 404)
        status = request.query_params.get('status', 'active')
        qs = Employee.objects.filter(positions__project=proj).distinct()
        if status == 'active':
            qs = qs.filter(status__in=['Active', 'active'])
        try:
            limit = min(500, max(1, int(request.query_params.get('limit', 100))))
            offset = max(0, int(request.query_params.get('offset', 0)))
        except ValueError:
            limit, offset = 100, 0
        total = qs.count()
        serializer = SCMEmployeeSerializer(qs[offset:offset+limit], many=True)
        next_url = f"{request.build_absolute_uri(request.path)}?limit={limit}&offset={offset+limit}" if offset + limit < total else None
        return self.paginated_response(serializer.data, total, limit, offset, next_url)

    @action(detail=True, methods=['get'])
    def positions(self, request, pk=None):
        try:
            proj = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No project with id {pk}', 404)
        ids_only = request.query_params.get('ids_only') in ['true', '1']
        qs = Position.objects.filter(project=proj)
        if ids_only:
            return self.single_response(list(qs.values_list('id', flat=True)))
        return self.single_response(SCMPositionSerializer(qs, many=True).data)


class SCMOfficeViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Office.objects.all()
        ids_only = request.query_params.get('ids_only') in ['true', '1']
        if ids_only:
            return self.single_response(list(qs.values_list('id', flat=True)[:20000]))

        serializer = SCMOfficeSerializer(qs, many=True)
        return self.single_response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            off = Office.objects.get(pk=pk)
        except Office.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No office with id {pk}', 404)

        serializer = SCMOfficeSerializer(off)
        return self.single_response(serializer.data)

    @action(detail=False, methods=['post'])
    def batch(self, request):
        ids = request.data.get('ids', [])
        qs = Office.objects.filter(id__in=ids)
        serializer = SCMOfficeSerializer(qs, many=True)
        found_ids = set(qs.values_list('id', flat=True))
        missing = [i for i in ids if i not in found_ids]
        return Response({'data': serializer.data, 'missing': missing}, status=200)

    @action(detail=True, methods=['get'])
    def descendants(self, request, pk=None):
        try:
            office = Office.objects.get(pk=pk)
        except Office.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No office with id {pk}', 404)
        visited = {office.id}
        frontier = {office.id}
        while frontier:
            children = set(Office.objects.filter(parent_id__in=frontier).values_list('id', flat=True))
            new_children = children - visited
            if not new_children:
                break
            visited.update(new_children)
            frontier = new_children
        desc_qs = Office.objects.filter(id__in=list(visited - {office.id}))
        return self.single_response(SCMOfficeSerializer(desc_qs, many=True).data)


class SCMDepartmentViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Department.objects.all()
        serializer = SCMDepartmentSerializer(qs, many=True)
        return self.single_response(serializer.data)


class SCMSectionViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Section.objects.all()
        serializer = SCMSectionSerializer(qs, many=True)
        return self.single_response(serializer.data)


class SCMPositionLevelViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = PositionLevel.objects.all()
        serializer = SCMPositionLevelSerializer(qs, many=True)
        return self.single_response(serializer.data)


class SCMFacilityViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = Facility.objects.all()
        ids_only = request.query_params.get('ids_only') in ['true', '1']
        if ids_only:
            return self.single_response(list(qs.values_list('id', flat=True)[:20000]))

        serializer = SCMFacilitySerializer(qs, many=True)
        return self.single_response(serializer.data)


class SCMHealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({
            'data': {
                'status': 'ok',
                'version': 'v1',
                'server_time': timezone.now().isoformat()
            }
        }, status=200)

class SCMPositionAssignmentViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = PositionAssignment.objects.all().select_related('assignee', 'position', 'position__department', 'position__office')
        status_param = request.query_params.get('status')
        if status_param == 'active':
            qs = qs.filter(status__in=['ACCEPTED', 'APPROVED'])
        elif status_param == 'inactive':
            qs = qs.exclude(status__in=['ACCEPTED', 'APPROVED'])
        
        ids_only = request.query_params.get('ids_only') in ['true', '1']
        if ids_only:
            return self.single_response(list(qs.values_list('id', flat=True)[:20000]))

        # Pagination
        try:
            limit = min(500, max(1, int(request.query_params.get('limit', 100))))
            offset = max(0, int(request.query_params.get('offset', 0)))
        except ValueError:
            limit, offset = 100, 0

        total = qs.count()
        page_qs = qs[offset:offset+limit]
        serializer = SCMPositionAssignmentSerializer(page_qs, many=True)

        next_url = None
        if offset + limit < total:
            next_url = f"{request.build_absolute_uri(request.path)}?limit={limit}&offset={offset+limit}"

        return self.paginated_response(serializer.data, total, limit, offset, next_url)

    def retrieve(self, request, pk=None):
        try:
            assignment = PositionAssignment.objects.select_related('assignee', 'position', 'position__department', 'position__office').get(pk=pk)
        except PositionAssignment.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No position assignment with id {pk}', 404)

        serializer = SCMPositionAssignmentSerializer(assignment)
        return self.single_response(serializer.data)

class SCMOfficeTypeViewSet(BaseSCMViewSet):
    def list(self, request):
        from core.models import OfficeType
        from core.scm_v1.serializers import SCMOfficeTypeSerializer
        qs = OfficeType.objects.all()
        serializer = SCMOfficeTypeSerializer(qs, many=True)
        return self.single_response(serializer.data)

class SCMFacilityMasterViewSet(BaseSCMViewSet):
    def list(self, request):
        from core.models import FacilityMaster
        from core.scm_v1.serializers import SCMFacilityMasterSerializer
        qs = FacilityMaster.objects.all()
        return self.single_response(SCMFacilityMasterSerializer(qs, many=True).data)


class SCMOrganizationLevelViewSet(BaseSCMViewSet):
    def list(self, request):
        qs = OrganizationLevel.objects.all()
        return self.single_response(SCMOrganizationLevelSerializer(qs, many=True).data)


class SCMWebhookViewSet(BaseSCMViewSet):
    @action(detail=False, methods=['get', 'post'], url_path='subscriptions')
    def subscriptions(self, request):
        api_key = request.auth
        if not api_key:
            return self.error_response('UNAUTHENTICATED', 'Missing or invalid API key', 401)
        if request.method == 'POST':
            api_key.webhook_url = request.data.get('url')
            api_key.webhook_events = request.data.get('events', [])
            api_key.save()
            return Response({'data': {'id': api_key.id, 'url': api_key.webhook_url, 'events': api_key.webhook_events, 'secret': api_key.key, 'status': 'active'}}, status=200)
        else:
            if not api_key.webhook_url:
                return self.single_response([])
            return self.single_response([{'id': api_key.id, 'url': api_key.webhook_url, 'events': api_key.webhook_events, 'secret': api_key.key, 'status': 'active'}])

    @action(detail=True, methods=['patch'], url_path='subscriptions')
    def update_subscription(self, request, pk=None):
        api_key = request.auth
        if not api_key or str(api_key.id) != str(pk):
            return self.error_response('FORBIDDEN', 'Access denied', 403)
        if 'url' in request.data:
            api_key.webhook_url = request.data['url']
        if 'events' in request.data:
            api_key.webhook_events = request.data['events']
        api_key.save()
        return Response({'data': {'id': api_key.id, 'url': api_key.webhook_url, 'events': api_key.webhook_events, 'status': 'active'}}, status=200)

    @action(detail=True, methods=['post'], url_path='rotate-secret')
    def rotate_secret(self, request, pk=None):
        import uuid
        api_key = request.auth
        if not api_key or str(api_key.id) != str(pk):
            return self.error_response('FORBIDDEN', 'Access denied', 403)
        api_key.key = f"sk_{uuid.uuid4().hex}"
        api_key.save()
        return Response({'data': {'id': api_key.id, 'secret': api_key.key}}, status=200)

    @action(detail=False, methods=['post'], url_path='test')
    def test_webhook(self, request):
        api_key = request.auth
        if not api_key:
            return self.error_response('UNAUTHENTICATED', 'Missing or invalid API key', 401)
        if not api_key.webhook_url:
            return self.error_response('VALIDATION_ERROR', 'No webhook URL configured', 422)
        from core.webhook_utils import fire_shift_webhook
        fire_shift_webhook('ping', {'ping': 'pong'})
        return Response({'data': {'status': 'dispatched'}}, status=200)

    @action(detail=False, methods=['get'], url_path='deliveries')
    def list_deliveries(self, request):
        from core.models import APIKeyUsageLog
        api_key = request.auth
        if not api_key:
            return self.error_response('UNAUTHENTICATED', 'Missing or invalid API key', 401)
        qs = APIKeyUsageLog.objects.filter(api_key=api_key, endpoint__startswith='[WEBHOOK ')
        status_param = request.query_params.get('status')
        if status_param == 'failed':
            qs = qs.exclude(status_code__in=[200, 201, 202, 204])
        deliveries = []
        for item in qs[:100]:
            parts = item.endpoint.split('] ', 1)
            deliveries.append({'id': item.id, 'event_type': parts[0].replace('[WEBHOOK ', ''), 'webhook_url': parts[1] if len(parts) > 1 else '', 'status_code': item.status_code, 'timestamp': item.timestamp.isoformat() + 'Z', 'success': item.status_code in [200, 201, 202, 204]})
        return self.single_response(deliveries)

    @action(detail=True, methods=['post'], url_path='redeliver')
    def redeliver(self, request, pk=None):
        from core.models import APIKeyUsageLog
        api_key = request.auth
        if not api_key:
            return self.error_response('UNAUTHENTICATED', 'Missing or invalid API key', 401)
        try:
            log_item = APIKeyUsageLog.objects.get(pk=pk, api_key=api_key)
        except APIKeyUsageLog.DoesNotExist:
            return self.error_response('NOT_FOUND', f'No delivery log with id {pk}', 404)
        from core.webhook_utils import fire_shift_webhook
        fire_shift_webhook('redelivery', {'original_log_id': log_item.id})
        return Response({'data': {'status': 'redelivery_dispatched'}}, status=200)


class SCMChangesView(APIView):
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.utils.dateparse import parse_datetime
        since_str = request.query_params.get('since')
        if not since_str:
            return Response({'error': {'code': 'BAD_REQUEST', 'message': 'Missing since parameter'}}, status=400)
        since = parse_datetime(since_str)
        if not since:
            return Response({'error': {'code': 'BAD_REQUEST', 'message': 'Invalid ISO timestamp'}}, status=400)
        entities = [e.strip() for e in request.query_params.get('entities', 'employees,positions').split(',')]
        limit = int(request.query_params.get('limit', 100))
        changes = []
        seq = 1
        if 'employees' in entities:
            for emp in Employee.objects.filter(created_at__gte=since)[:limit]:
                changes.append({'sequence': seq, 'occurred_at': emp.created_at.isoformat() + 'Z', 'event_type': 'employee.created', 'entity': 'employee', 'entity_id': emp.id})
                seq += 1
        if 'positions' in entities:
            for pos in Position.objects.filter(created_at__gte=since)[:limit]:
                changes.append({'sequence': seq, 'occurred_at': pos.created_at.isoformat() + 'Z', 'event_type': 'position.created', 'entity': 'position', 'entity_id': pos.id})
                seq += 1
        changes = changes[:limit]
        return Response({'data': changes, 'page': {'limit': limit, 'offset': 0, 'total': len(changes), 'next': None}}, status=200)
