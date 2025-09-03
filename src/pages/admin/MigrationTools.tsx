import React, { useState } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Download,
  Upload,
} from "lucide-react";
import { runMigrationFromAdmin } from "../../services/migrateSpecialties";

const MigrationTools: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  const handleMigration = async () => {
    setIsRunning(true);
    setMigrationResult("");

    try {
      const result = await runMigrationFromAdmin();
      setMigrationResult(result);
    } catch (error) {
      setMigrationResult(`❌ Erreur: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Database className="h-8 w-8 mr-3 text-blue-600" />
          Outils de Migration
        </h1>
        <p className="text-gray-600">
          Outils pour migrer et maintenir les données de la plateforme Health-e
        </p>
      </div>

      {/* Migration des Spécialités */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-blue-600" />
              Migration des Spécialités
            </h2>
            <p className="text-gray-600 mt-1">
              Migre les anciennes spécialités vers le nouveau système étendu
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                Qu'est-ce que cette migration fait ?
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Ajoute les champs <code>category</code> et{" "}
                  <code>primarySpecialty</code> aux professionnels
                </li>
                <li>
                  Mappe les anciennes spécialités vers le nouveau référentiel
                </li>
                <li>Conserve les anciens champs pour la compatibilité</li>
                <li>
                  Est idempotente (peut être exécutée plusieurs fois sans
                  problème)
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleMigration}
            disabled={isRunning}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              isRunning
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Migration en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Lancer la Migration
              </>
            )}
          </button>

          {migrationResult && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {showDetails ? "Masquer" : "Voir"} les Détails
            </button>
          )}
        </div>

        {migrationResult && (
          <div className="mt-4">
            <div
              className={`p-4 rounded-lg border ${
                migrationResult.includes("❌")
                  ? "bg-red-50 border-red-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-start">
                {migrationResult.includes("❌") ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="text-sm">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {migrationResult}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informations sur le Nouveau Système */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Info className="h-5 w-5 mr-2 text-green-600" />
          Nouveau Système de Spécialités
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Santé Mentale</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Psychiatre</li>
              <li>• Psychologue clinicien</li>
              <li>• Psychothérapeute agréé</li>
              <li>• Neuropsychologue</li>
              <li>• Addictologue</li>
              <li>• Pédopsychiatre</li>
              <li>• Gérontopsychiatre</li>
              <li>• Infirmier en santé mentale</li>
              <li>• Coach en développement personnel</li>
              <li>• Conseiller en orientation</li>
              <li>• Travailleur social en santé mentale</li>
              <li>• Pair-aidant</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Santé Sexuelle</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Gynécologue</li>
              <li>• Urologue</li>
              <li>• Sexologue clinicien</li>
              <li>• Sage-femme</li>
              <li>• Dermatologue-vénéréologue</li>
              <li>• Endocrinologue</li>
              <li>• Andrologue</li>
              <li>• Médecin généraliste en santé sexuelle</li>
              <li>• Conseiller en planning familial</li>
              <li>• Éducateur en santé sexuelle</li>
              <li>• Psychologue en sexologie</li>
              <li>• Travailleur social en santé sexuelle</li>
              <li>• Médiateur familial</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationTools;
