<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions
        $permissions = [
            'tickets.create',
            'tickets.view',
            'tickets.edit',
            'tickets.close',
            'tickets.reprioritize',
            'users.create',
            'users.edit',
            'users.view_all',
            'enrollments.create',
            'enrollments.view',
            'enrollments.approve',
            'enrollments.void',
            'dashboard.view_global',
            'dashboard.view_own_department',
            'roles.assign',
            'settings.manage',
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::create(['name' => $permission]);
        }

        // Create roles and assign created permissions
        $admin = \Spatie\Permission\Models\Role::create(['name' => 'admin']);
        $admin->givePermissionTo(\Spatie\Permission\Models\Permission::all());

        $jefe = \Spatie\Permission\Models\Role::create(['name' => 'jefe']);
        $jefe->givePermissionTo([
            'tickets.view',
            'users.view_all',
            'enrollments.view',
            'dashboard.view_global',
        ]);

        $jefeDepartamento = \Spatie\Permission\Models\Role::create(['name' => 'jefe_departamento']);
        $jefeDepartamento->givePermissionTo([
            'tickets.create',
            'tickets.view',
            'tickets.edit',
            'tickets.close',
            'tickets.reprioritize',
            'dashboard.view_own_department',
        ]);

        $jefeAsesores = \Spatie\Permission\Models\Role::create(['name' => 'jefe_asesores']);
        $jefeAsesores->givePermissionTo([
            'enrollments.view',
            'enrollments.approve',
        ]);

        $asesorAcademico = \Spatie\Permission\Models\Role::create(['name' => 'asesor_academico']);
        $asesorAcademico->givePermissionTo([
            'enrollments.create',
            'enrollments.view',
        ]);

        // Create initial admin user
        $user = User::create([
            'name' => 'Super Administrador',
            'email' => 'admin@icep.com',
            'password' => bcrypt('1234'),
        ]);

        $user->assignRole($admin);
    }
}
