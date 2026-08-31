"""phase7_attendance_record_cleanup

Revision ID: 2a0527789235
Revises: 1b0527789234
Create Date: 2026-08-17 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a0527789235'
down_revision: Union[str, Sequence[str], None] = '1b0527789234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop columns from attendance_records
    op.drop_column('attendance_records', 'department_id_at_attendance')
    op.drop_column('attendance_records', 'semester_at_attendance')
    op.drop_column('attendance_records', 'section_at_attendance')
    
    # Make subject_id nullable
    op.alter_column('attendance_records', 'subject_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    # Revert subject_id to not nullable
    op.alter_column('attendance_records', 'subject_id',
               existing_type=sa.INTEGER(),
               nullable=False)
               
    # Re-add columns
    op.add_column('attendance_records', sa.Column('section_at_attendance', sa.VARCHAR(length=10), autoincrement=False, nullable=False, server_default='A'))
    op.add_column('attendance_records', sa.Column('semester_at_attendance', sa.INTEGER(), autoincrement=False, nullable=False, server_default='1'))
    op.add_column('attendance_records', sa.Column('department_id_at_attendance', sa.INTEGER(), autoincrement=False, nullable=False, server_default='1'))
    
    # Remove server defaults after adding
    op.alter_column('attendance_records', 'section_at_attendance', server_default=None)
    op.alter_column('attendance_records', 'semester_at_attendance', server_default=None)
    op.alter_column('attendance_records', 'department_id_at_attendance', server_default=None)
