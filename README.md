# Photo web 1.2 — Brave sur macOS

Un clic sur l’appareil photo ou **F8** capture toute la page en PNG. Les captures sont enregistrées directement dans **Documents / Photo web / site - date_heure**, regroupées par périodes de **cinq minutes**. Chaque image porte le domaine, le chemin, la date et l’heure.

## Activer la correction

1. Ouvrir `brave://extensions`.
2. Sur **Photo web**, cliquer sur **Actualiser** (flèche circulaire). Si Brave demande d’autoriser la communication avec une application locale, accepter pour permettre l’enregistrement dans Documents.
3. Recharger la page web à photographier. Cliquer sur l’icône ou utiliser **F8** (parfois **Fn + F8** sur Mac). Le raccourci **⌘ ⇧ Y** fonctionne aussi.

Le composant local est déjà installé sur cet ordinateur. Aucun changement au dossier de téléchargement de Brave n’est nécessaire. Le badge **✓** n’apparaît qu’après la confirmation de l’écriture du PNG.

## Installation sur un autre Mac ou après déplacement

1. Placer l’extension dans le dossier souhaité.
2. Exécuter `python3 /chemin/photo-web-extension/native/install.py` dans Terminal.
3. Dans `brave://extensions`, activer **Mode développeur**, puis **Charger l’extension non empaquetée** et choisir ce dossier.
4. Épingler l’extension et recharger les pages ouvertes.

L’identifiant de l’extension non empaquetée dépend de son chemin : relancer l’installation du composant si le dossier est déplacé. Le script suppose cet identifiant dérivé du chemin, sans clé de manifeste personnalisée.

## Réglages

Clic droit sur l’icône → **Réglages de Photo web** : durée du groupe (1 à 120 minutes), nom du dossier dans Documents et touche F6/F7/F8/F9 ou désactivation. La touche unique ne déclenche pas de capture pendant la saisie dans un champ. Le raccourci système est modifiable dans `brave://extensions/shortcuts`.

Le premier clic commence un groupe. Toutes les images prises dans les cinq minutes suivantes vont dans ce dossier, même si elles viennent de sites différents. Le premier clic après expiration ouvre un nouveau dossier. La durée n’est pas prolongée par chaque clic. Aucun screenshot automatique n’est pris.

Clic droit → **Commencer un nouveau groupe** permet de séparer deux tâches immédiatement. **Afficher la dernière image dans le Finder** ouvre le dossier du dernier fichier. Les fichiers existants ne sont jamais écrasés.

Exemple : `Documents/Photo web/jacoballen.ca - 2026-11-10_16-30-00-000/jacoballen.ca_about_2026-11-10_16-30-00-000.png`.

Les barres obliques sont remplacées par des underscores. Les paramètres de requête et fragments sont omis du nom pour éviter d’y inclure des jetons. La date et l’heure sont locales.

## Ce qui a été corrigé en 1.1

- Remplacement de la capture hors écran par des captures de portions visibles assemblées en un PNG. La dernière portion est recadrée pour éviter les répétitions.
- Pré-défilement pour charger les sections différées. Les éléments fixes déjà visibles en haut sont masqués sur les portions suivantes.
- Restauration de la position initiale et des styles temporaires, même en cas d’échec de capture.
- Écriture directe et atomique dans Documents via un composant local. Aucun passage par les téléchargements ni fenêtre « Enregistrer sous ».

## Fonctionnement local et limites

La page défile pendant quelques secondes : éviter de cliquer, de défiler ou de naviguer pendant la capture. Une bannière temporaire de débogage est normale ; ce n’est pas un blocage de Brave. Si les outils de développement empêchent l’attachement, les fermer et recommencer.

Les pages internes et certaines pages protégées sont exclues. Les panneaux ayant leur propre défilement, les pages virtualisées, les listes infinies et les animations perpétuelles peuvent demander une capture adaptée. Limite : 32 767 pixels par dimension et 60 mégapixels. Le PNG est produit en pixels CSS pour limiter la mémoire. La restauration est impossible si la page est fermée ou remplacée durant la capture.

Le composant Python standard n’ouvre aucun port et n’utilise aucun réseau. Il n’accepte que les captures `.png` dans une arborescence de trois niveaux sous Documents, refuse les traversées et liens symboliques, et limite la taille des données. Il ne reçoit que les images et noms générés par l’extension. Les échanges sont découpés pour respecter les limites de Native Messaging. Le Finder n’est ouvert que sur demande.

Sur macOS, Brave consulte aussi `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`. Le manifeste y autorise uniquement l’identifiant de Photo web. Ce connecteur peut également être utilisé si cette même extension est installée dans Chrome. [Documentation officielle Brave](https://brave.github.io/bravebot/customize/mcp/brave/).

## Permissions

- `debugger` : capture du rendu et défilement temporaire de la page, uniquement pendant une capture.
- `activeTab` et `tabs` : identifier l’onglet actif et son URL.
- `nativeMessaging` : enregistrer le PNG via le composant local.
- `storage` : réglages, groupe courant et résultat de la dernière capture.
- `contextMenus` : réglages, nouveau groupe et Finder.
- Script sur les pages HTTP/HTTPS : détecter F8 dans le cadre principal.

## Vérification

`npm test` : tests des groupes, noms, assemblage, recadrage et restauration en cas d’échec.

`python3 tests/native_test.py` : écriture locale, doublons, chemins interdits, liens symboliques et nettoyage d’une écriture interrompue.

Capture testée dans une instance isolée de Brave sur `jacoballen.ca`, avec écriture effective dans Documents. Le rechargement dans votre profil Brave habituel reste nécessaire après mise à jour.

## Confirmation et noms des dossiers (1.2)

Après l’écriture du PNG, une confirmation apparaît en bas à droite : **Photo enregistrée**, avec **Ouvrir le dossier** et un bouton de fermeture. Elle reste visible jusqu’à sa fermeture ou la prochaine capture et n’apparaît pas dans les captures suivantes.

Chaque nouveau groupe porte le domaine du premier site capturé, suivi d’un tiret et de la date/heure. Le regroupement de cinq minutes continue à inclure tous les sites ; le nom du premier site est conservé durant ce groupe. Les anciens dossiers ne sont pas renommés.
