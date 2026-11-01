# Truchement

Module Foundry VTT v14 qui traduit en français, à l'import, le contenu créé par Plutonium.

Aucun texte traduit n'est distribué : la traduction se fait localement, chez chaque MJ, sur ce qu'il importe.

## Installation

Dans Foundry, *Modules complémentaires → Installer un module*, coller le lien du manifeste :

```
https://github.com/quill-and-seal/truchement/releases/latest/download/module.json
```

## Fonctionnement

À la création d'un objet, d'un acteur (avec ses objets embarqués) ou d'un journal, Truchement traduit le nom et la description, puis met à jour le document. Le texte anglais d'origine est conservé dans `flags.truchement.original`.

Réglages :

- **Traduction automatique** — active ou coupe la traduction à l'import.
- **Uniquement les imports Plutonium** — ne traduit que les documents portant les flags de Plutonium.
- **Afficher l'équivalent des distances** — affiche en petit la distance dans l'unité opposée (réglage par joueur).

API, depuis une macro :

```js
const api = game.modules.get("truchement").api;
await api.translateDocument(item);  // traduire un document existant
await api.revertDocument(item);     // revenir au texte d'origine
```

## Moteur de traduction

Chaque phrase descend quatre couches jusqu'à ce que l'une d'elles la traite :

1. **Mémoire** — phrases déjà connues (`src/engine/pipeline.js`)
2. **Gabarits** — phrases formulaires des règles, reconnues par regex (`src/engine/patterns.js`)
3. **Dictionnaire** — termes de jeu, expressions figées, genre des noms (`src/engine/glossary.js`)
4. **Moteur neuronal** — secours pour la prose libre, termes protégés par marqueurs (à brancher)

Les phrases qu'aucune couche ne sait traiter restent en anglais.

Les distances restent dans l'unité du texte source, avec l'équivalent dans l'unité opposée affiché en petit (calcul exact, 1 pied = 0,3048 m).

## Tester le moteur

```sh
node test/run.mjs
```

## Publier une version

Créer une release GitHub avec un tag `vX.Y.Z` : le workflow `release.yml` met à jour le manifeste et attache `module.json` et `module.zip`.
