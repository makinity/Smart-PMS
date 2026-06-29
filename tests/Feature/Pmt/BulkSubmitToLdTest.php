<?php

namespace Tests\Feature\Pmt;

use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\Office;
use App\Models\PerformancePeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BulkSubmitToLdTest extends TestCase
{
    use RefreshDatabase, WithoutMiddleware;

    private function makePmt(): User
    {
        Role::firstOrCreate(['name' => 'pmt', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('pmt');
        return $user;
    }

    private function makePlan(array $overrides = []): DevelopmentPlan
    {
        Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);

        $office = Office::create(['name' => 'Test Office', 'code' => 'TST', 'is_active' => true]);
        $period = PerformancePeriod::create([
            'name' => 'Jan-Jun 2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $employee = User::factory()->create(['office_id' => $office->id]);
        $employee->assignRole('employee');

        $opcr = \App\Models\Opcr::create([
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'status' => 'approved',
        ]);

        $ipcr = Ipcr::create([
            'employee_id' => $employee->id,
            'opcr_id' => $opcr->id,
            'performance_period_id' => $period->id,
            'status' => 'committed',
            'final_score' => 1.20,
            'adjectival_rating' => 'Poor',
        ]);

        return DevelopmentPlan::create(array_merge([
            'ipcr_id' => $ipcr->id,
            'employee_id' => $employee->id,
            'office_id' => $office->id,
            'performance_period_id' => $period->id,
            'source_score' => 1.20,
            'source_rating' => 'Poor',
            'status' => DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
            'idp_rows' => [['performance_gap' => 'Needs improvement', 'developmental_activity' => 'Training', 'support_needed' => '', 'support_from_supervisor' => '', 'expected_completion' => 'Q3 2026', 'results' => '']],
        ], $overrides));
    }

    public function test_bulk_submit_flips_status_and_stores_reference_id(): void
    {
        config(['services.lnd.base_url' => 'http://lnd.test', 'services.lnd.token' => 'test-token']);

        Http::fake([
            '*' => Http::response([
                'status' => 'acknowledged',
                'lnd_reference_id' => 'MOCK-LND-REF-ABCD1234',
            ], 201),
        ]);

        $pmt = $this->makePmt();
        $plan = $this->makePlan();

        $this->actingAs($pmt)
            ->post('/pmt/idp/bulk-submit', ['ids' => [$plan->id]])
            ->assertSessionHas('success');

        $plan->refresh();

        $this->assertSame(DevelopmentPlan::STATUS_SUBMITTED_TO_LD, $plan->status);
        $this->assertSame(DevelopmentPlan::LND_SYNC_ACKNOWLEDGED, $plan->lnd_sync_status);
        $this->assertSame('MOCK-LND-REF-ABCD1234', $plan->lnd_reference_id);
        $this->assertNotNull($plan->submitted_to_ld_at);
        $this->assertNotNull($plan->lnd_synced_at);
    }

    public function test_bulk_submit_marks_failed_when_lnd_returns_error(): void
    {
        Http::fake([
            '*' => Http::response(['message' => 'Service unavailable'], 503),
        ]);

        $pmt = $this->makePmt();
        $plan = $this->makePlan();

        $this->actingAs($pmt)
            ->post('/pmt/idp/bulk-submit', ['ids' => [$plan->id]])
            ->assertSessionHas('error');

        $plan->refresh();

        $this->assertSame(DevelopmentPlan::STATUS_SUBMITTED_TO_PMT, $plan->status);
        $this->assertSame(DevelopmentPlan::LND_SYNC_FAILED, $plan->lnd_sync_status);
        $this->assertNotNull($plan->lnd_last_error);
    }

    public function test_bulk_submit_skips_plans_not_in_submitted_to_pmt_status(): void
    {
        Http::fake(['*' => Http::response(['status' => 'acknowledged', 'lnd_reference_id' => 'X'], 201)]);

        $pmt = $this->makePmt();
        $plan = $this->makePlan(['status' => DevelopmentPlan::STATUS_SUBMITTED_TO_LD]);

        $this->actingAs($pmt)
            ->post('/pmt/idp/bulk-submit', ['ids' => [$plan->id]])
            ->assertSessionHas('error');

        Http::assertNothingSent();
    }
}
