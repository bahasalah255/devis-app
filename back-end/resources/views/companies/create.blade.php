@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Créer / Mettre à jour la société</h1>

    @if(session('status'))
        <div class="alert alert-success">{{ session('status') }}</div>
    @endif

    <form action="{{ route('companies.store') }}" method="POST" enctype="multipart/form-data">
        @csrf

        <div class="form-group">
            <label for="name">Nom de la société</label>
            <input id="name" name="name" class="form-control" value="{{ old('name') }}" required>
        </div>

        <div class="form-group">
            <label for="slogan">Slogan</label>
            <input id="slogan" name="slogan" class="form-control" value="{{ old('slogan') }}">
        </div>

        <div class="form-group">
            <label for="logo">Logo (image)</label>
            <input id="logo" type="file" name="logo" class="form-control">
        </div>

        <div class="form-group">
            <label for="address">Adresse</label>
            <input id="address" name="address" class="form-control" value="{{ old('address') }}">
        </div>

        <div class="form-group">
            <label for="phone">Téléphone</label>
            <input id="phone" name="phone" class="form-control" value="{{ old('phone') }}">
        </div>

        <div class="form-group">
            <label for="email">E-mail</label>
            <input id="email" name="email" class="form-control" value="{{ old('email') }}">
        </div>

        <div class="form-row">
            <div class="form-group col-md-6">
                <label for="tva_type">Type TVA</label>
                <input id="tva_type" name="tva_type" class="form-control" value="{{ old('tva_type') }}">
            </div>
            <div class="form-group col-md-6">
                <label for="tva_percent">TVA %</label>
                <input id="tva_percent" name="tva_percent" class="form-control" value="{{ old('tva_percent') }}">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group col-md-4">
                <label for="if_number">I.F.</label>
                <input id="if_number" name="if_number" class="form-control" value="{{ old('if_number') }}">
            </div>
            <div class="form-group col-md-4">
                <label for="patente">Patente</label>
                <input id="patente" name="patente" class="form-control" value="{{ old('patente') }}">
            </div>
            <div class="form-group col-md-4">
                <label for="rc">R.C.</label>
                <input id="rc" name="rc" class="form-control" value="{{ old('rc') }}">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group col-md-6">
                <label for="cnss">C.N.S.S.</label>
                <input id="cnss" name="cnss" class="form-control" value="{{ old('cnss') }}">
            </div>
            <div class="form-group col-md-6">
                <label for="ice">ICE</label>
                <input id="ice" name="ice" class="form-control" value="{{ old('ice') }}">
            </div>
        </div>

        <button class="btn btn-primary" type="submit">Enregistrer</button>
    </form>
</div>
@endsection
