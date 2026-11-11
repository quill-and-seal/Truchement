# Truchement

Module Foundry VTT v14 qui traduit en français, à l'import, le contenu créé par Plutonium.

Aucun texte traduit n'est distribué : la traduction se fait localement, chez chaque MJ, sur ce qu'il importe.

## Installation

Dans Foundry, *Modules complémentaires → Installer un module*, coller le lien du manifeste :

```
https://github.com/quill-and-seal/Truchement/releases/latest/download/module.json
```

## Fonctionnement

À la création d'un objet, d'un acteur (avec ses objets embarqués) ou d'un journal, Truchement attend la fin de l'import (1,5 s sans modification), traduit le nom et la description, vérifie que rien n'a changé entre-temps, puis met à jour le document. Le texte anglais d'origine est conservé dans `flags.truchement.original`.

**Badge d'état** dans l'en-tête de chaque fiche (acteur, objet, journal) :

- grisé : non traduit — un clic lance la traduction (si la fiche n'a aucun texte à traduire, elle passe quand même sur FR pour traduire l'interface) ;
- **FR** (vert) : traduction affichée — un clic affiche la version d'origine ;
- **EN** (orange) : version d'origine affichée — un clic revient à la traduction.

La bascule s'applique aussi aux objets d'un acteur et aux pages d'un journal, sans relancer le modèle. Seul le MJ peut cliquer.

**Maj+clic** sur le badge : retraduire depuis la version d'origine (utile après une mise à jour du module).

**Alt+clic** sur un libellé traduit de l'interface (MJ) : saisir sa traduction à la main. La correction est enregistrée dans le monde, partagée avec les joueurs, et prime sur le modèle.

**Drapeau** à côté du badge (MJ) : signaler un problème de traduction. Truchement capture la fiche en FR puis en EN et envoie les captures, les textes et une remarque facultative au relais de signalement, qui crée une issue `[Traduction] Nom — Type` dans le dépôt privé `quill-and-seal/truchement-reports` (ou y ajoute un commentaire si elle existe déjà). Aucun compte GitHub n'est nécessaire. Le relais (serveur + mise à jour automatique) se trouve dans le dépôt privé `quill-and-seal/truchement-reports`.

Un libellé traduit trop long pour sa place est réduit (jusqu'à 70 %), puis coupé avec « … » ; le texte complet reste en infobulle.

Quand le badge est sur **FR**, toute la fiche passe en français, **interface comprise** (libellés, onglets, infobulles, boutons). Seul l'affichage change ; en mode EN la fiche revient entièrement en anglais. Seuls les libellés d'interface connus de Foundry (cœur, système, modules) sont traduits à l'affichage ; le contenu de la fiche (noms, descriptions) n'est jamais retraité par cette partie. L'infobulle des objets suit aussi le mode FR. Pour l'interface, Truchement utilise en priorité les fichiers de langue français des modules installés (traductions du cœur de Foundry et du système dnd5e), même si Foundry reste en anglais, puis le modèle pour le reste. Installer ces modules de traduction améliore nettement les libellés courts.

Réglages :

- **Traduction automatique** — active ou coupe la traduction à l'import.
- **Uniquement les imports Plutonium** — ne traduit que les documents portant les flags de Plutonium.
- **Traduire l'interface des fiches** — traduit aussi les libellés de la fiche quand le badge est sur FR (réglage par joueur).
- **Afficher l'équivalent des distances** — affiche en petit la distance dans l'unité opposée (réglage par joueur).

API, depuis une macro :

```js
const api = game.modules.get("truchement").api;
await api.translateDocument(item);  // traduire un document existant
await api.toggleDocument(item);     // basculer traduction ↔ version d'origine
api.stateOf(item);                  // "none", "fr" ou "en"
```

## Moteur de traduction

Un document qui vient d'un **compendium déjà traduit** (Babele, compendium aux noms français, ou dont un seul champ est déjà en français) est ignoré en entier, objets embarqués compris. Les textes déjà en français ne sont jamais retraduits : un document en français (compendium traduit, Babele, saisie) est ignoré, et dans un document mélangé seules les phrases anglaises sont traduites (`src/engine/lang.js`).

Chaque texte passe par les couches suivantes, dans l'ordre :

1. **Glossaire** — correspondances fixes, prioritaires sur tout le reste (`data/glossaire.json`, voir ci-dessous).
1. **Cache** — phrases déjà traduites, rempli automatiquement et conservé dans le navigateur (`src/nmt/client.js`).
2. **Gabarits de règles** — phrases formulaires (jets de sauvegarde, dégâts, soins, montée en niveau, formules des blocs de stats) reconnues par regex et reconstruites par algorithme, avec accords et genre (`src/engine/patterns.js`).
3. **Modèle neuronal** — tout le reste : prose, noms, fragments. Modèle Marian `opus-mt-en-fr` exécuté localement avec transformers.js, dans un worker pour ne pas figer Foundry (`src/nmt/worker.js`).

Au premier usage, le modèle (~75 Mo) est téléchargé une fois puis mis en cache par le navigateur (Cache API en HTTPS, IndexedDB si Foundry est ouvert en `http://`). Si le modèle est indisponible, seules les phrases de règles sont traduites.

Les jets en ligne (`[[/attack]]`, `[[/damage …]]`), les liens `@UUID[…]` et les balises HTML ne sont jamais modifiés ; seul leur libellé `{…}` est traduit.

Les distances restent dans l'unité du texte source, avec l'équivalent dans l'unité opposée affiché en petit (calcul exact, 1 pied = 0,3048 m).

## Glossaire

`data/glossaire.json` contient les termes de jeu et libellés courants dont le modèle se trompe hors contexte :

- **`termes`** — correspondance exacte d'un texte entier (`"Roll": "Jet"`), majuscules comprises, puis sans tenir compte de la casse ;
- **`formules`** — libellés à variables (`"Roll {ability} Saving Throw": "Jet de sauvegarde de {ability}"`) ; les variables sont elles-mêmes traduites par le glossaire.
- **`expressions`** — termes protégés **à l'intérieur des phrases** envoyées au modèle (`"saving throw": "jet de sauvegarde"`) : remplacés par des marqueurs avant le modèle, puis par leur traduction après (majuscule seulement en début de phrase). Si le modèle perd un marqueur, la phrase est renvoyée avec le français écrit directement dedans.

Il s'applique au contenu (noms, libellés des jets en ligne, noms composés « X (Y) » partie par partie) comme à l'interface. Les corrections faites par **Alt+clic** dans Foundry passent avant le fichier ; pour qu'une correction profite à tous, ajoute-la au fichier dans le dépôt.

## Tester le moteur

```sh
node test/run.mjs
```

Le banc d'essai utilise un faux modèle : il vérifie les gabarits, le cache, la protection des jets en ligne et l'annotation des distances.

## Historique

Voir [CHANGELOG.md](CHANGELOG.md).

## Publier une version

Ajouter la version dans `CHANGELOG.md`, puis créer une release GitHub avec un tag `vX.Y.Z` : le workflow `release.yml` met à jour le manifeste et attache `module.json` et `module.zip`.
