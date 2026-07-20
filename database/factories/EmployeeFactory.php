<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            // user_id must be provided by the caller or via UserFactory::afterCreating
            'employee_id'        => 'EMP-' . strtoupper(fake()->unique()->bothify('####')),
            'hms_employee_id'    => null,
            'first_name'         => fake()->firstName(),
            'middle_name'        => fake()->lastName(), // used as middle name
            'last_name'          => fake()->lastName(),
            'office_id'          => null,
            'position'           => fake()->jobTitle(),
            'is_active'          => true,
            'is_disabled'        => false,
            'activated_at'       => now(),
            'profile_photo_path' => null,
            'training_locked'    => false,
            'lnd_reference_id'   => null,
        ];
    }

    /**
     * Mark employee as inactive (pending activation).
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active'    => false,
            'activated_at' => null,
        ]);
    }

    /**
     * Mark employee as training-locked.
     */
    public function trainingLocked(): static
    {
        return $this->state(fn (array $attributes) => [
            'training_locked'  => true,
            'lnd_reference_id' => fake()->uuid(),
        ]);
    }
}
