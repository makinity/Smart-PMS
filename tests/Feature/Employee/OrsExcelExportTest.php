<?php

namespace Tests\Feature\Employee;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Office;
use App\Models\OrsEntry;
use App\Models\OrsEntryMonitoring;
use App\Models\PerformancePeriod;
use App\Models\UnitWorkPlan;
use App\Models\UwpFunction;
use App\Models\UwpMfo;
use App\Models\UwpSuccessIndicator;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrsExcelExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_export_rated_ors_entry_to_excel(): void
    {
        Role::findOrCreate('employee', 'web');
        Role::findOrCreate('supervisor', 'web');

        $office = Office::create([
            'name' => 'Provincial Information and Communications Technology Office',
            'code' => 'PICTO',
        ]);

        $employee = User::factory()->create([
            'name' => 'Jane Doe',
            'role' => 'employee',
        ]);
        $employee->assignRole('employee');

        $supervisor = User::factory()->create([
            'name' => 'John Boss',
            'role' => 'supervisor',
        ]);
        $supervisor->assignRole('supervisor');

        $period = PerformancePeriod::create([
            'name' => '1st Sem 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $uwp = UnitWorkPlan::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'created_by' => $supervisor->id,
            'status' => 'approved',
        ]);

        $function = UwpFunction::create([
            'unit_work_plan_id' => $uwp->id,
            'function_type' => 'core',
            'name' => 'Core Functions',
        ]);

        $mfo = UwpMfo::create([
            'uwp_function_id' => $function->id,
            'title' => 'Core Systems Maintenance',
        ]);

        $indicator = UwpSuccessIndicator::create([
            'uwp_mfo_id' => $mfo->id,
            'indicator_text' => 'Process 100% of IT requests within 2 hours',
        ]);

        $opcr = \App\Models\Opcr::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'status' => 'approved',
        ]);

        $ipcr = Ipcr::create([
            'employee_id' => $employee->id,
            'opcr_id' => $opcr->id,
            'performance_period_id' => $period->id,
            'status' => 'approved',
        ]);

        $ipcrItem = IpcrItem::create([
            'ipcr_id' => $ipcr->id,
            'uwp_success_indicator_id' => $indicator->id,
        ]);

        $ors = OrsEntry::create([
            'employee_id' => $employee->id,
            'supervisor_id' => $supervisor->id,
            'performance_period_id' => $period->id,
            'ipcr_id' => $ipcr->id,
            'ipcr_item_id' => $ipcrItem->id,
            'work_date' => now()->toDateString(),
            'notes' => 'Completed network configuration and troubleshooting',
            'quantity' => 5,
            'status' => 'rated',
            'submitted_at' => now(),
        ]);

        OrsEntryMonitoring::create([
            'ors_entry_id' => $ors->id,
            'supervisor_id' => $supervisor->id,
            'quality_rating' => 5.0,
            'timeliness_rating' => 4.5,
            'remarks' => 'Excellent performance and timely delivery.',
            'rated_at' => now(),
        ]);

        $response = $this->actingAs($employee)
            ->get('/stage-one/forms/ors-excel?ors_id=' . $ors->id);

        $response->assertOk();
        $this->assertTrue(
            str_starts_with(
                $response->headers->get('content-type'),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        );
    }
}
