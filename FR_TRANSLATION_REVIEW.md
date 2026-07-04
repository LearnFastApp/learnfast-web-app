# French Translation Review

Strings added during FR localisation that need native-speaker sign-off before production launch.

## Priority 1 — AI assessment feedback (user-visible, high-impact)

These strings are generated dynamically by Claude but shaped by culture guidance in `lib/ai-locale-block.ts`. A native speaker should run 3–5 assessments in FR and review:

- Are score rationale paragraphs idiomatic? (fluency, not just grammatically correct)
- Are tip sentences actionable and natural-sounding?
- Does the summary feel encouraging rather than clinical?

**Test by:** Setting locale to `fr`, recording a 60-second rehearsal, and reviewing the full assessment card.

---

## Priority 2 — UI catalogue strings (`locales/fr.ts`)

File: `locales/fr.ts`

Strings to verify:

### `common` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `loading` | "Chargement…" | OK |
| `save` | "Enregistrer" | OK |
| `cancel` | "Annuler" | OK |
| `back` | "Retour" | OK |
| `continue` | "Continuer" | OK |
| `delete` | "Supprimer" | OK |
| `edit` | "Modifier" | OK |
| `close` | "Fermer" | OK |
| `error` | "Erreur" | OK |
| `success` | "Succès" | OK |
| `or` | "ou" | OK |

### `dashboard` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `welcomeBack` | "Bon retour," | Verify — "Bon retour" is correct but "Bienvenue de retour" is also used informally |
| `newSession` | "Nouvelle session" | OK |
| `newRehearsal` | "Nouvel entraînement" | Check — "Nouvelle répétition" may be more natural in coaching context |
| `myRehearsal` | "Mes entraînements" | Verify plural form |
| `viewAll` | "Tout voir" | OK |
| `noRehearsal` | "Aucune répétition pour l'instant" | OK |

### `rehearsal` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `setupTitle` | "Configurer la répétition" | OK |
| `durationLabel` | "Durée" | OK |
| `contextLabel` | "Contexte" | OK |

### `aiAssessment` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `overallScore` | "Score global" | OK |
| `clarity` | "Clarté" | OK |
| `energy` | "Énergie" | OK |
| `engagement` | "Engagement" | OK |
| `understanding` | "Compréhension" | OK |
| `connection` | "Connexion" | ⚠️ Consider "Lien" or "Rapport" in a coaching/speaking context |
| `highlights` | "Points forts" | OK |
| `areasToImprove` | "Axes de progrès" | OK — natural in French coaching |
| `fillerWords` | "Mots de remplissage" | ⚠️ "Mots parasites" is more natural in FR |
| `wordsPerMinute` | "Mots par minute" | OK |

### `settings` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `language` | "Langue" | OK |
| `languageDesc` | "Choisissez votre langue d'interface" | OK |
| `saveLanguage` | "Enregistrer la langue" | OK |

### `createRehearsalModal` namespace
| Key | Current FR | Notes |
|-----|-----------|-------|
| `title` | "Nouvelle répétition" | OK |
| `errUpgrade` | "Passez à Pro pour des répétitions plus longues" | ⚠️ Naturalness check |
| `errFreeLimit` | "Limite gratuite atteinte" | OK |
| `errMonthlyLimit` | "Limite mensuelle atteinte" | OK |
| `errFileTooLarge` | "Fichier trop volumineux (max 50 Mo)" | OK |
| `errGeneric` | "Une erreur est survenue. Veuillez réessayer." | OK |
| `errNetwork` | "Erreur réseau. Veuillez réessayer." | OK |

---

## Priority 3 — Context labels (`lib/contexts/registry.ts`)

Each AssessmentContext now has an `i18n.fr` entry. Verify these are appropriate for the FR professional audience:

| contextId | FR label | FR description snippet |
|-----------|---------|----------------------|
| `general` | "Prise de parole générale" | ✅ standard |
| `board_presentation` | "Présentation au conseil" | ✅ |
| `team_talk` | "Prise de parole en équipe" | ⚠️ "Discours d'équipe" may feel more natural |
| `investor_pitch` | "Pitch investisseur" | ✅ "pitch" is accepted in FR startup culture |
| `cold_call` | "Appel à froid" | ✅ |
| `conference_talk` | "Conférence / keynote" | ✅ |
| `coach_to_athletes` | "Coach vers athlètes" | ⚠️ Consider "Discours de coach" |

---

## Priority 4 — Email templates (`lib/email.ts`)

FR subject lines added:
- Org invite: `"Rejoignez [org] sur LearnFast"` — verify with a test invite
- Session confirmation: `"Confirmation de session — [date]"` — verify date formatting (should be `DD/MM/YYYY` for FR)

---

## Sign-off checklist

- [ ] Native speaker (FR) reviewed all Priority 1 AI outputs
- [ ] Priority 2 table annotations resolved
- [ ] Priority 3 context labels confirmed
- [ ] Priority 4 email subjects tested end-to-end
- [ ] `fillerWords` label changed to "Mots parasites" if agreed
- [ ] `connection` dimension label decision recorded here
