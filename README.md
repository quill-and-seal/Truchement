# Truchement

Module Foundry VTT de traduction en français du contenu importé par Plutonium.

Aucun texte traduit n'est distribué : la traduction se fait localement, chez chaque MJ, sur ce qu'il importe.

## Moteur de traduction (prototype)

Chaque phrase descend quatre couches jusqu'à ce que l'une d'elles la traite :

1. **Mémoire** — phrases déjà connues (`src/engine/pipeline.js`)
2. **Gabarits** — phrases formulaires des règles, reconnues par regex (`src/engine/patterns.js`)
3. **Dictionnaire** — termes de jeu, expressions figées, genre des noms (`src/engine/glossary.js`)
4. **Moteur neuronal** — secours pour la prose libre, termes protégés par marqueurs (à brancher)

Les distances sont converties selon la convention de la VF (5 pieds = 1,5 m).

## Tester

```sh
node test/run.mjs
```
