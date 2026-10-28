import datetime
from rest_framework import serializers
from core.models import (
    Employee, Position, Office, Department, Section, Role, PositionLevel, Project, Facility,
    PositionAssignment, RoleSubGroup, PositionType, Shift, FacilityMaster, OrganizationLevel
)

class SafeDateField(serializers.DateField):
    def to_representation(self, value):
        if isinstance(value, datetime.datetime):
            value = value.date()
        return super().to_representation(value)

class SCMOfficeSerializer(serializers.ModelSerializer):
    code = serializers.SerializerMethodField()
    parent_office_id = serializers.SerializerMethodField()
    office_type = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    level_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()
    project_ids = serializers.SerializerMethodField()

    class Meta:
        model = Office
        fields = ['id', 'code', 'name', 'office_type', 'level', 'level_name', 'parent_office_id', 'address', 'city', 'state', 'status', 'projects', 'project_ids']

    def get_code(self, obj):
        return getattr(obj, 'code', f"OFF-{obj.id}")

    def get_office_type(self, obj):
        if hasattr(obj, 'office_type') and obj.office_type:
            return str(getattr(obj.office_type, 'name', obj.office_type))
        return None

    def get_parent_office_id(self, obj):
        return obj.parent.id if hasattr(obj, 'parent') and obj.parent else None

    def get_level(self, obj):
        if hasattr(obj, 'level') and obj.level:
            return {'id': obj.level.id, 'name': obj.level.name, 'rank': getattr(obj.level, 'level_order', 1)}
        return None

    def get_level_name(self, obj):
        return obj.level.name if hasattr(obj, 'level') and obj.level else None

    def get_status(self, obj):
        return 'Active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'Inactive'

    def get_city(self, obj):
        return getattr(obj, 'city', None)

    def get_state(self, obj):
        return getattr(obj, 'state', None)

    def get_projects(self, obj):
        try:
            return [{'id': p.id, 'name': p.name, 'code': getattr(p, 'project_id', getattr(p, 'code', f"PRJ-{p.id}"))} for p in obj.projects.all()]
        except Exception:
            return []

    def get_project_ids(self, obj):
        try:
            return [p.id for p in obj.projects.all()]
        except Exception:
            return []


class SCMDepartmentSerializer(serializers.ModelSerializer):
    office_id = serializers.SerializerMethodField()
    office = serializers.SerializerMethodField()
    office_details = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    head_employee_id = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'code', 'name', 'office_id', 'office', 'office_details', 'project_id', 'project', 'head_employee_id', 'status']

    def get_office_id(self, obj):
        return obj.office.id if obj.office else None

    def get_office(self, obj):
        return obj.office.id if obj.office else None

    def get_office_details(self, obj):
        if obj.office:
            return {'id': obj.office.id, 'name': obj.office.name, 'code': getattr(obj.office, 'code', f"OFF-{obj.office.id}")}
        return None

    def get_project_id(self, obj):
        return obj.project.id if obj.project else None

    def get_project(self, obj):
        if obj.project:
            return {'id': obj.project.id, 'name': obj.project.name, 'code': getattr(obj.project, 'project_id', getattr(obj.project, 'code', f"PRJ-{obj.project.id}"))}
        return None

    def get_head_employee_id(self, obj):
        if hasattr(obj, 'head_employee') and obj.head_employee:
            return obj.head_employee.id
        return None

    def get_status(self, obj):
        return 'Active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'Inactive'


class SCMSectionSerializer(serializers.ModelSerializer):
    department_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    office_id = serializers.SerializerMethodField()
    office = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'code', 'name', 'department_id', 'department', 'office_id', 'office', 'project_id', 'project', 'status']

    def get_department_id(self, obj):
        return obj.department.id if obj.department else None

    def get_department(self, obj):
        if obj.department:
            return {'id': obj.department.id, 'name': obj.department.name, 'code': getattr(obj.department, 'code', f"DEP-{obj.department.id}")}
        return None

    def get_office_id(self, obj):
        if obj.department and obj.department.office:
            return obj.department.office.id
        return None

    def get_office(self, obj):
        if obj.department and obj.department.office:
            off = obj.department.office
            return {'id': off.id, 'name': off.name, 'code': getattr(off, 'code', f"OFF-{off.id}")}
        return None

    def get_project_id(self, obj):
        if obj.project:
            return obj.project.id
        if obj.department and obj.department.project:
            return obj.department.project.id
        return None

    def get_project(self, obj):
        proj = obj.project or (obj.department.project if obj.department else None)
        if proj:
            return {'id': proj.id, 'name': proj.name, 'code': getattr(proj, 'project_id', getattr(proj, 'code', f"PRJ-{proj.id}"))}
        return None

    def get_status(self, obj):
        return 'Active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'Inactive'


class SCMRoleSerializer(serializers.ModelSerializer):
    rank = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'rank', 'status']

    def get_rank(self, obj):
        return getattr(obj, 'rank', 1)

    def get_status(self, obj):
        return 'active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'inactive'


class SCMPositionLevelSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = PositionLevel
        fields = ['id', 'code', 'name', 'rank', 'status']

    def get_status(self, obj):
        return 'active'


class SCMProjectSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='project_id', read_only=True)
    offices = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    headcount = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'code', 'name', 'start_date', 'offices', 'status', 'headcount']

    def get_offices(self, obj):
        try:
            return [{'id': o.id, 'name': o.name} for o in obj.offices.all()]
        except Exception:
            return []

    def get_status(self, obj):
        return 'Active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'Inactive'

    def get_headcount(self, obj):
        if self.context.get('include_headcount'):
            return Employee.objects.filter(project=obj, status__in=['Active', 'active']).count()
        return None


class SCMFacilitySerializer(serializers.ModelSerializer):
    facility_type = serializers.SerializerMethodField()
    office_id = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = ['id', 'code', 'name', 'facility_type', 'office_id', 'address', 'status']

    def get_facility_type(self, obj):
        if hasattr(obj, 'facility_master') and obj.facility_master:
            return obj.facility_master.name
        return None

    def get_office_id(self, obj):
        return obj.office.id if hasattr(obj, 'office') and obj.office else None

    def get_status(self, obj):
        return 'active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'inactive'


def _get_position_project(pos):
    if not pos:
        return None
    if hasattr(pos, 'project') and pos.project:
        return pos.project
    if hasattr(pos, 'department') and pos.department and pos.department.project:
        return pos.department.project
    if hasattr(pos, 'section') and pos.section and pos.section.project:
        return pos.section.project
    if hasattr(pos, 'office') and pos.office and hasattr(pos.office, 'projects'):
        return pos.office.projects.first()
    return None


class SCMPositionSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    parent_position_id = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    job_name = serializers.SerializerMethodField()
    office_level = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    office = serializers.SerializerMethodField()
    office_id = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    section_id = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    holder_count = serializers.SerializerMethodField()

    class Meta:
        model = Position
        fields = [
            'id', 'code', 'name', 'status', 'parent_position_id', 'level', 'role',
            'role_id', 'role_name',
            'job_name', 'office_level', 'department', 'department_id', 'office', 'office_id',
            'section', 'section_id', 'project', 'project_id', 'holder_count'
        ]

    def get_status(self, obj):
        return 'Active' if getattr(obj, 'status', 'Active') in ['Active', 'active', True] else 'Inactive'

    def get_role_id(self, obj):
        return obj.role.id if hasattr(obj, 'role') and obj.role else None

    def get_role_name(self, obj):
        return obj.role.name if hasattr(obj, 'role') and obj.role else obj.name

    def get_parent_position_id(self, obj):
        if hasattr(obj, 'reporting_to'):
            parent = obj.reporting_to.first()
            return parent.id if parent else None
        return None

    def get_level(self, obj):
        if hasattr(obj, 'level') and obj.level:
            return {
                'id': obj.level.id,
                'code': getattr(obj.level, 'name', f"L{obj.level.id}"),
                'name': obj.level.name,
                'rank': getattr(obj.level, 'rank', 1)
            }
        return None

    def get_role(self, obj):
        if hasattr(obj, 'role') and obj.role:
            return {'id': obj.role.id, 'name': obj.role.name}
        return None

    def get_job_name(self, obj):
        if hasattr(obj, 'job') and obj.job:
            return obj.job.name
        return obj.name

    def get_office_level(self, obj):
        if hasattr(obj, 'office') and obj.office:
            if hasattr(obj.office, 'office_type') and obj.office.office_type:
                return str(getattr(obj.office.office_type, 'name', obj.office.office_type))
            if hasattr(obj.office, 'level') and obj.office.level:
                return str(getattr(obj.office.level, 'name', obj.office.level))
        return 'State'

    def get_department(self, obj):
        if hasattr(obj, 'department') and obj.department:
            return {'id': obj.department.id, 'name': obj.department.name}
        if hasattr(obj, 'section') and obj.section and obj.section.department:
            return {'id': obj.section.department.id, 'name': obj.section.department.name}
        return None

    def get_department_id(self, obj):
        if hasattr(obj, 'department') and obj.department:
            return obj.department.id
        if hasattr(obj, 'section') and obj.section and obj.section.department_id:
            return obj.section.department_id
        return None

    def get_office(self, obj):
        if hasattr(obj, 'office') and obj.office:
            return {'id': obj.office.id, 'name': obj.office.name}
        if hasattr(obj, 'department') and obj.department and obj.department.office:
            return {'id': obj.department.office.id, 'name': obj.department.office.name}
        return None

    def get_office_id(self, obj):
        if hasattr(obj, 'office') and obj.office:
            return obj.office.id
        if hasattr(obj, 'department') and obj.department and obj.department.office_id:
            return obj.department.office_id
        return None

    def get_section(self, obj):
        if hasattr(obj, 'section') and obj.section:
            return {'id': obj.section.id, 'name': obj.section.name, 'code': getattr(obj.section, 'code', f"SEC-{obj.section.id}")}
        return None

    def get_section_id(self, obj):
        return obj.section.id if hasattr(obj, 'section') and obj.section else None

    def get_project(self, obj):
        proj = _get_position_project(obj)
        if proj:
            return {'id': proj.id, 'name': proj.name, 'code': getattr(proj, 'project_id', getattr(proj, 'code', f"PRJ-{proj.id}"))}
        return None

    def get_project_id(self, obj):
        proj = _get_position_project(obj)
        return proj.id if proj else None

    def get_holder_count(self, obj):
        return obj.employees.filter(status__in=['Active', 'active']).count()


class SCMEmployeeSerializer(serializers.ModelSerializer):
    """
    SCM Employee Serializer: 100% Schema Parity with live SCM integration endpoints.
    Provides complete payload compatibility for employee, position, project, office,
    geo_location, and positions_details while maintaining strict PII financial security.
    """
    position = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    office = serializers.SerializerMethodField()
    positions_details = serializers.SerializerMethodField()

    # Flat top-level fields for SCM OpenAPI compatibility
    id = serializers.IntegerField(read_only=True)
    employee_code = serializers.CharField(read_only=True, default=None)
    name = serializers.CharField(read_only=True, default=None)
    full_name = serializers.CharField(source='name', read_only=True, default=None)
    email = serializers.CharField(read_only=True, default=None)
    phone = serializers.CharField(read_only=True, default=None)
    status = serializers.SerializerMethodField()
    date_of_joining = SafeDateField(source='hire_date', read_only=True, default=None)
    date_of_exit = SafeDateField(source='employment_end_date', read_only=True, default=None)
    department = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    primary_position = serializers.SerializerMethodField()
    reporting_manager = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    # Flat convenience IDs
    office_id = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    section_id = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_code', 'name', 'full_name', 'email', 'phone', 'status',
            'date_of_joining', 'date_of_exit',
            'position', 'project', 'office', 'positions_details',
            'department', 'section', 'primary_position', 'reporting_manager', 'updated_at',
            'office_id', 'department_id', 'section_id', 'project_id'
        ]

    def get_status(self, obj):
        return 'Active' if (getattr(obj, 'status', '') or '').upper() == 'ACTIVE' else 'Inactive'

    def get_position(self, obj):
        pos = obj.positions.first()
        if not pos:
            return None

        role_name = pos.role.name if pos.role else pos.name
        role_id = pos.role.id if pos.role else None
        level_name = pos.level.name if pos.level else None
        level_id = pos.level.id if pos.level else None
        level_rank = getattr(pos.level, 'rank', getattr(pos.level, 'level_order', 1)) if pos.level else 1
        dept_name = pos.department.name if pos.department else None
        sec_name = pos.section.name if pos.section else None

        reporting_list = []
        if hasattr(pos, 'reporting_to'):
            for parent in pos.reporting_to.all():
                holder = parent.employees.filter(status__in=['Active', 'active']).first()
                reporting_list.append({
                    'id': parent.id,
                    'position_name': parent.name,
                    'position_code': getattr(parent, 'code', None),
                    'role_name': parent.role.name if parent.role else parent.name,
                    'level_name': parent.level.name if parent.level else None,
                    'level_rank': getattr(parent.level, 'rank', 1) if parent.level else 1,
                    'employee_id': holder.id if holder else None,
                    'employee_name': holder.name if holder else None,
                    'employee_code': getattr(holder, 'employee_code', None) if holder else None,
                    'employee_email': getattr(holder, 'email', None) if holder else None,
                    'employee_status': 'Active' if holder else None
                })

        return {
            'id': pos.id,
            'name': pos.name,
            'code': getattr(pos, 'code', None),
            'position_type_id': getattr(pos, 'position_type_id', None),
            'position_type': str(getattr(pos.position_type, 'name', None)) if getattr(pos, 'position_type', None) else None,
            'role_id': role_id,
            'role_name': role_name,
            'role_sub_group_id': getattr(pos, 'role_sub_group_id', None),
            'role_sub_group_name': str(getattr(pos.role_sub_group, 'name', None)) if getattr(pos, 'role_sub_group', None) else None,
            'department': dept_name,
            'section': sec_name,
            'level_id': level_id,
            'level_name': level_name,
            'level_rank': level_rank,
            'reporting_to': reporting_list,
            'additional_roles': [],
            'additional_sub_groups': [],
            'additional_jobs': []
        }

    def get_project(self, obj):
        pos = obj.positions.first()
        proj = _get_position_project(pos)
        if proj:
            return {
                'id': proj.id,
                'name': proj.name,
                'code': getattr(proj, 'code', getattr(proj, 'project_id', f"PRJ-{proj.id}"))
            }
        return None

    def get_office(self, obj):
        pos = obj.positions.first()
        off = pos.office if (pos and pos.office) else getattr(obj, 'office', None)
        if not off:
            return None

        fac_type = None
        if hasattr(off, 'facility_master') and off.facility_master:
            fac_type = off.facility_master.name
        elif hasattr(off, 'office_type') and off.office_type:
            fac_type = str(getattr(off.office_type, 'name', off.office_type))

        geo = {
            'mandal': off.mandal.name if hasattr(off, 'mandal') and off.mandal else None,
            'district': off.district.name if hasattr(off, 'district') and off.district else None,
            'state': off.state.name if hasattr(off, 'state') and off.state else None,
            'cluster': off.cluster.name if hasattr(off, 'cluster') and off.cluster else None,
            'cluster_type': str(getattr(off.cluster, 'cluster_type', None)) if hasattr(off, 'cluster') and off.cluster else None
        }

        return {
            'id': off.id,
            'name': off.name,
            'code': getattr(off, 'code', f"OFF-{off.id}"),
            'facility_type': fac_type,
            'sac': getattr(off, 'sac', None),
            'vehicle_code': getattr(off, 'vehicle_code', None),
            'vehicle_no': getattr(off, 'vehicle_no', None),
            'geo_location': geo
        }

    def get_positions_details(self, obj):
        positions_list = []
        for pos in obj.positions.all():
            positions_list.append({
                'id': pos.id,
                'name': pos.name,
                'code': getattr(pos, 'code', None),
                'role_name': pos.role.name if pos.role else pos.name,
                'section_name': pos.section.name if pos.section else None
            })
        return positions_list

    def get_department(self, obj):
        pos = obj.positions.first()
        if pos and pos.department:
            return {'id': pos.department.id, 'code': getattr(pos.department, 'code', f"DEP-{pos.department.id}"), 'name': pos.department.name}
        return None

    def get_section(self, obj):
        pos = obj.positions.first()
        if pos and pos.section:
            return {'id': pos.section.id, 'code': getattr(pos.section, 'code', f"SEC-{pos.section.id}"), 'name': pos.section.name}
        return None

    def get_primary_position(self, obj):
        pos = obj.positions.first()
        if pos:
            return {'id': pos.id, 'name': pos.name}
        return None

    def get_reporting_manager(self, obj):
        if obj.reporting_to:
            return {'id': obj.reporting_to.id, 'name': obj.reporting_to.name}
        pos = obj.positions.first()
        if pos and hasattr(pos, 'reporting_to'):
            parent = pos.reporting_to.first()
            if parent:
                holder = parent.employees.filter(status__in=['Active', 'active']).first()
                if holder:
                    return {'id': holder.id, 'name': holder.name}
        return None

    def get_updated_at(self, obj):
        return getattr(obj, 'created_at', None)

    def get_office_id(self, obj):
        off = self.get_office(obj)
        return off['id'] if off else None

    def get_department_id(self, obj):
        dept = self.get_department(obj)
        return dept['id'] if dept else None

    def get_section_id(self, obj):
        sec = self.get_section(obj)
        return sec['id'] if sec else None

    def get_project_id(self, obj):
        proj = self.get_project(obj)
        return proj['id'] if proj else None


class SCMPositionAssignmentSerializer(serializers.ModelSerializer):
    employee = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    position_id = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    office = serializers.SerializerMethodField()
    office_id = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    section_id = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    is_primary = serializers.SerializerMethodField()
    valid_from = serializers.SerializerMethodField()
    valid_to = serializers.SerializerMethodField()

    class Meta:
        model = PositionAssignment
        fields = [
            'id', 'employee', 'employee_id', 'position', 'position_id',
            'department', 'department_id', 'office', 'office_id',
            'section', 'section_id', 'project', 'project_id',
            'is_primary', 'valid_from', 'valid_to', 'status'
        ]

    def get_employee(self, obj):
        emp = getattr(obj, 'assignee', None)
        if not emp:
            return None
        return {'id': emp.id, 'name': emp.name, 'employee_code': getattr(emp, 'employee_code', None)}

    def get_employee_id(self, obj):
        return obj.assignee.id if getattr(obj, 'assignee', None) else None

    def get_position(self, obj):
        return {'id': obj.position.id, 'name': obj.position.name} if obj.position else None

    def get_position_id(self, obj):
        return obj.position.id if obj.position else None

    def get_department(self, obj):
        dept = obj.position.department if (obj.position and obj.position.department) else None
        return {'id': dept.id, 'name': dept.name} if dept else None

    def get_department_id(self, obj):
        return obj.position.department_id if (obj.position and obj.position.department_id) else None

    def get_office(self, obj):
        off = obj.position.office if (obj.position and obj.position.office) else None
        return {'id': off.id, 'name': off.name} if off else None

    def get_office_id(self, obj):
        return obj.position.office_id if (obj.position and obj.position.office_id) else None

    def get_section(self, obj):
        sec = obj.position.section if (obj.position and obj.position.section) else None
        return {'id': sec.id, 'name': sec.name, 'code': getattr(sec, 'code', f"SEC-{sec.id}")} if sec else None

    def get_section_id(self, obj):
        return obj.position.section_id if (obj.position and obj.position.section_id) else None

    def get_project(self, obj):
        proj = _get_position_project(obj.position) if obj.position else None
        return {'id': proj.id, 'name': proj.name, 'code': getattr(proj, 'project_id', getattr(proj, 'code', f"PRJ-{proj.id}"))} if proj else None

    def get_project_id(self, obj):
        proj = _get_position_project(obj.position) if obj.position else None
        return proj.id if proj else None

    def get_is_primary(self, obj):
        return True

    def get_valid_from(self, obj):
        return obj.created_at.date().isoformat() if getattr(obj, 'created_at', None) else None

    def get_valid_to(self, obj):
        return obj.expires_at.date().isoformat() if getattr(obj, 'expires_at', None) else None

    def get_status(self, obj):
        return 'active' if getattr(obj, 'status', 'Active') in ['Active', 'active', 'ACCEPTED', 'APPROVED', True] else 'inactive'

class SCMOfficeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        from core.models import OfficeType
        model = OfficeType
        fields = ['id', 'name', 'code', 'description']

class SCMFacilityMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityMaster
        fields = ['id', 'name', 'location_code', 'description', 'status']


class SCMOrganizationLevelSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationLevel
        fields = ['id', 'name', 'rank', 'description', 'status']

    def get_status(self, obj):
        return 'active'
