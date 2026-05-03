<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CompanyController extends Controller
{
    /**
     * Return the authenticated user's company or null.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->company);
    }

    /**
     * Create a company for the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->company) {
            return response()->json(['message' => 'Company already exists'], 409);
        }

        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'domain' => 'required|string|max:255',
            'tva_type' => 'required|string|max:50',
        ]);

        $company = Company::create(array_merge($data, ['user_id' => $user->id]));

        return response()->json($company, 201);
    }
}
