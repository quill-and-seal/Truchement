# Truchement

Module Foundry VTT v14 qui traduit en français, à l'import, le contenu créé par Plutonium.

Aucun texte traduit n'est distribué : la traduction se fait localement, chez chaque MJ, sur ce qu'il importe.

## Installation

Dans Foundry, *Modules complémentaires → Installer un module*, coller le lien du manifeste :

```
https://github.com/quill-and-seal/Truchement/releases/latest/download/module.json
```

## Fonctionnement

À la création d'un objet, d'un acteur (avec ses objets embarqués) ou d'un journal, Truchement traduit le nom et la description, puis met à jour le document. Le texte anglais d'origine est conservé dans `flags.truchement.original`.

**Badge d'état** dans l'en-tête de chaque fiche (acteur, objet, journal) :

- grisé : non traduit — un clic lance la traduction ;
- **FR** (vert) : traduction affichée — un clic affiche la version d'origine ;
- **EN** (orange) : version d'origine affichée — un clic revient à la traduction.

La bascule s'applique aussi aux objets d'un acteur et aux pages d'un journal, sans relancer le modèle. Seul le MJ peut cliquer.

**Maj+clic** sur le badge : retraduire depuis la version d'origine (utile après une mise à jour du module).

Truchement traduit le **contenu** des documents (noms, descriptions, textes libres des traits comme les langues ou sens spéciaux). Les libellés de l'interface des fiches (« Speed », « Darkvision », types de dégâts, infobulles…) relèvent de la langue de Foundry et des modules de traduction française du cœur et du système dnd5e.

Réglages :

- **Traduction automatique** — active ou coupe la traduction à l'import.
- **Uniquement les imports Plutonium** — ne traduit que les documents portant les flags de Plutonium.
- **Afficher l'équivalent des distances** — affiche en petit la distance dans l'unité opposée (réglage par joueur).

API, depuis une macro :

```js
const api = game.modules.get("truchement").api;
await api.translateDocument(item);  // traduire un document existant
await api.toggleDocument(item);     // basculer traduction ↔ version d'origine
api.stateOf(item);                  // "none", "fr" ou "en"
```

## Moteur de traduction

Aucun dictionnaire : chaque phrase passe par trois couches.

1. **Cache** — phrases déjà traduites, rempli automatiquement et conservé dans le navigateur (`src/nmt/client.js`).
2. **Gabarits de règles** — phrases formulaires (jets de sauvegarde, dégâts, soins, montée en niveau, formules des blocs de stats) reconnues par regex et reconstruites par algorithme, avec accords et genre (`src/engine/patterns.js`).
3. **Modèle neuronal** — tout le reste : prose, noms, fragments. Modèle Marian `opus-mt-en-fr` exécuté localement avec transformers.js, dans un worker pour ne pas figer Foundry (`src/nmt/worker.js`).

Au premier usage, le modèle (~75 Mo) est téléchargé une fois puis mis en cache par le navigateur. Si le modèle est indisponible, seules les phrases de règles sont traduites.

Les jets en ligne (`[[/attack]]`, `[[/damage …]]`), les liens `@UUID[…]` et les balises HTML ne sont jamais modifiés ; seul leur libellé `{…}` est traduit.

Les distances restent dans l'unité du texte source, avec l'équivalent dans l'unité opposée affiché en petit (calcul exact, 1 pied = 0,3048 m).

## Tester le moteur

```sh
node test/run.mjs
```

Le banc d'essai utilise un faux modèle : il vérifie les gabarits, le cache, la protection des jets en ligne et l'annotation des distances.

## Publier une version

Créer une release GitHub avec un tag `vX.Y.Z` : le workflow `release.yml` met à jour le manifeste et attache `module.json` et `module.zip`.
