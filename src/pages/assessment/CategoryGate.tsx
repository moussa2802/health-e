/**
 * CategoryGate — les anciennes pages /assessment/:category faisaient doublon avec Mon espace.
 *  - mental, bonus → /espace/mental (même liste, nouveau design)
 *  - sexual → /espace/intime, SAUF tant que les questions de situation (filtre vie intime) ne sont pas faites
 *    ou quand on arrive pour lancer un test précis (?test=…) : la page garde alors ce rôle de porte d'entrée.
 *  - ?tab=profil → /assessment/profile
 */
import React, { Suspense, lazy } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isSexualFilterComplete } from '../../utils/sexualHealthFilter';

const AssessmentCategoryPage = lazy(() => import('./AssessmentCategoryPage'));

const CategoryGate: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [sp] = useSearchParams();
  if (sp.get('tab') === 'profil') return <Navigate to="/assessment/profile" replace />;
  if (category === 'mental' || category === 'bonus') return <Navigate to="/espace/mental" replace />;
  if (category === 'sexual' && isSexualFilterComplete() && !sp.get('test')) return <Navigate to="/espace/intime" replace />;
  if (category !== 'sexual') return <Navigate to="/espace" replace />;
  return <Suspense fallback={null}><AssessmentCategoryPage /></Suspense>;
};

export default CategoryGate;
