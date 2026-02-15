# EmploymentType

**Purpose**: Classifies the employment arrangement for workers

**Schema**: `core`
**PostgreSQL Name**: `employment_type`
**Last Updated**: 2026-01-30

## Values

| Value | Description | Usage Context |
|-------|-------------|---------------|
| `full_time` | Full-time employee with standard hours | Regular employees working 30-40+ hours/week |
| `part_time` | Part-time employee with reduced hours | Employees working less than full-time hours |
| `contractor` | Independent contractor or consultant | Non-employee workers with contracts |
| `temp` | Temporary or seasonal worker | Short-term employees, often through agencies |

## Business Context

The `EmploymentType` enum distinguishes between different worker classifications for:

1. **Payroll Processing**: Different tax and benefit rules per type
2. **Scheduling**: Different availability and hour constraints
3. **Benefits Eligibility**: Full-time vs part-time benefits
4. **Compliance**: Labor law requirements vary by employment type
5. **Cost Tracking**: Different rate structures for contractors vs employees

## Usage

### In Models

Used in:
- `User.employmentType` - Classifies the employment arrangement for each user/employee

### Default Values

- `User.employmentType` defaults to `full_time` - Most employees are full-time

## Validation

### Application-Level

- **Required**: All employees must have an employment type
- **Cannot Change Unboundedly**: Changes may require compliance review
- **Affects Benefits**: Change to `part_time` may affect benefits eligibility

### Database-Level

- **PostgreSQL Enum**: Only defined values allowed
- **Default Value**: `full_time` for new employees

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| 2026-01-30 | Initial enum creation | Part of core schema setup |

## Future Changes

- [ ] Consider adding `intern` value for internship programs
- [ ] Consider adding `on_call` for on-demand workers

## Related

- **User Model**: Primary use case for employment classification
- **Staff Scheduling**: Availability and hour limits vary by type
- **Payroll Integration**: Different processing per employment type

## See Also

- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Line 2652
- [User Documentation](../tables/User.md) - Employee model documentation
