<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class CompanyController extends Controller
{
    public function index()
    {
        return response()->json(
            Company::where('user_id', Auth::id())->first()
        );
    }

    public function create()
    {
        return view('companies.create');
    }

    public function store(Request $request)
    {
        $data = $request->all();

        if (empty($data['name']) && !empty($data['company_name'])) {
            $data['name'] = $data['company_name'];
        }

        $data = validator($data, [
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'domain' => 'nullable|string|max:255',
            'slogan' => 'nullable|string|max:255',
            'logo' => 'nullable|image|max:2048',
            'address' => 'nullable|string|max:1024',
            'phone' => 'nullable|string|max:50',
            'fax' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tva_type' => 'nullable|string|max:255',
            'tva_percent' => 'nullable|numeric',
            'if_number' => 'nullable|string|max:100',
            'patente' => 'nullable|string|max:100',
            'rc' => 'nullable|string|max:100',
            'cnss' => 'nullable|string|max:100',
            'ice' => 'nullable|string|max:100',
        ])->validate();

        unset($data['company_name'], $data['domain']);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('companies', 'public');
            $data['logo'] = $path;
        }

        $data['user_id'] = Auth::id();

        $company = Company::create($data);

        if ($request->expectsJson()) {
            return response()->json($company, 201);
        }

        return redirect()->route('companies.create')->with('status', 'Company saved successfully.');
    }
}

