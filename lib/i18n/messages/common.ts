/**
 * Shared messages: app shell, UI kit, notices, units. Flat map, every key starts with "common.".
 * Interpolation uses {name} placeholders. Plural forms use the suffixes .one / .other (see `tp` in lib/i18n).
 */
const it = {
  'common.app.name': 'FIRE Planner Italia',
  'common.app.shortName': 'FIRE Planner',
  'common.app.country': 'Italia',
  'common.app.tagline': 'Quando posso smettere di lavorare?',
  'common.app.description':
    'Quando posso smettere di lavorare? Pianificatore FIRE con fiscalità italiana 2026, fondo pensione, TFR, INPS e Monte Carlo.',
  'common.loading': 'Caricamento…',
  'common.skipToContent': 'Vai al contenuto principale',

  'common.actions.cancel': 'Annulla',
  'common.actions.confirm': 'Conferma',
  'common.actions.save': 'Salva',
  'common.actions.close': 'Chiudi',
  'common.actions.dismiss': 'Chiudi avviso',
  'common.actions.retry': 'Riprova',

  'common.plan.selectLabel': 'Piano',
  'common.plan.actions': 'Azioni sul piano',
  'common.plan.new': 'Nuovo piano',
  'common.plan.newFromExample': 'Crea da un esempio',
  'common.plan.duplicate': 'Duplica',
  'common.plan.rename': 'Rinomina',
  'common.plan.delete': 'Elimina',
  'common.plan.copyName': '{name} (copia)',
  'common.plan.renameTitle': 'Rinomina il piano',
  'common.plan.nameLabel': 'Nome del piano',
  'common.plan.nameRequired': 'Il nome non può essere vuoto.',
  'common.plan.deleteTitle': 'Eliminare il piano?',
  'common.plan.deleteBody':
    'Il piano «{name}» verrà eliminato da questo browser. Se vuoi conservarlo, esporta prima un file JSON.',
  'common.plan.deleteLast': 'Deve rimanere almeno un piano.',

  'common.example.base': 'Base',
  'common.example.prudent': 'Prudente',
  'common.example.optimistic': 'Ottimista',
  'common.example.baseHint': 'Ipotesi centrali',
  'common.example.prudentHint': 'Rendimenti più bassi, inflazione più alta',
  'common.example.optimisticHint': 'Rendimenti più alti, inflazione più bassa',

  'common.lang.label': 'Lingua',
  'common.lang.it': 'IT',
  'common.lang.en': 'EN',
  'common.lang.itName': 'Italiano',
  'common.lang.enName': 'English',

  'common.valueMode.label': 'Valori mostrati',
  'common.valueMode.real': '€ di oggi',
  'common.valueMode.nominal': 'Nominale',
  'common.valueMode.realHelp': 'Importi in potere d’acquisto di oggi (al netto dell’inflazione).',
  'common.valueMode.nominalHelp': 'Importi in euro correnti dell’anno in cui avvengono.',

  'common.menu.label': 'Menu',
  'common.menu.open': 'Apri il menu',
  'common.menu.export': 'Esporta JSON',
  'common.menu.import': 'Importa JSON…',
  'common.menu.reset': 'Ripristina gli esempi…',

  'common.import.title': 'Importa piani',
  'common.import.planCount.one': '1 piano trovato nel file «{file}».',
  'common.import.planCount.other': '{count} piani trovati nel file «{file}».',
  'common.import.explain':
    'Verranno aggiunti come nuovi piani: quelli che hai già non vengono modificati né sostituiti.',
  'common.import.needsFixes': 'Da correggere',
  'common.import.confirm': 'Importa',
  'common.import.messagesTitle': 'Note sul file',
  'common.import.error.parse': 'Il file non è un JSON valido.',
  'common.import.error.readFailed': 'Impossibile leggere il file.',
  'common.import.error.noPlans': 'Nel file non c’è nessun piano riconoscibile.',
  'common.import.error.notAPlan': 'L’elemento n. {index} non è un piano e verrà ignorato.',
  'common.import.error.newerVersion':
    'Il file proviene da una versione più recente dell’app (schema {version}): alcuni dati potrebbero non essere riconosciuti.',
  'common.import.legacyConverted':
    'File della versione precedente: gli scenari sono stati convertiti. Controlla i dati dopo l’importazione.',

  'common.reset.title': 'Ripristinare i piani di esempio?',
  'common.reset.body':
    'Tutti i tuoi piani verranno sostituiti dai tre piani di esempio. Una copia di sicurezza resta nel browser, ma ti consigliamo di esportare prima un file JSON.',
  'common.reset.confirm': 'Ripristina',

  'common.notices.label': 'Avvisi',
  'common.notice.migrated':
    'Abbiamo convertito i dati della versione precedente ({count} piani). Controllali: v2 aggiunge spese, età e pensioni.',
  'common.notice.migrationFailed':
    'Abbiamo trovato dati della versione precedente ma non è stato possibile convertirli: partiamo dai piani di esempio. I vecchi dati restano salvati nel browser.',
  'common.notice.corrupted':
    'I dati salvati erano illeggibili: ne abbiamo conservato una copia ({key}) e caricato i piani di esempio.',
  'common.notice.unknownVersion':
    'I dati salvati provengono da un’altra versione dell’app (schema {version}). Ne abbiamo conservato una copia ({key}).',
  'common.notice.droppedEntries':
    'Abbiamo ignorato {count} elementi salvati che non erano piani. Copia dei dati originali: {key}.',
  'common.notice.backupFailed':
    'Non è stato possibile salvare una copia dei dati illeggibili: in questa sessione le modifiche non verranno salvate, per non sovrascriverli.',
  'common.notice.saveFailed':
    'Impossibile salvare nel browser (spazio esaurito o navigazione privata). Le modifiche restano finché non chiudi la pagina: esporta un file JSON per conservarle.',
  'common.notice.storageUnavailable':
    'L’archiviazione del browser non è disponibile: i piani non verranno salvati. Esporta un file JSON per conservarli.',
  'common.notice.importDone': 'Piani importati: {count}.',
  'common.notice.resetDone': 'Piani di esempio ripristinati. Copia dei piani precedenti: {key}.',
  'common.notice.resetDoneNoBackup': 'Piani di esempio ripristinati.',

  'common.nav.label': 'Sezioni',
  'common.nav.inputs': 'Dati',
  'common.nav.results': 'Risultati',
  'common.panel.inputs': 'Dati del piano',
  'common.panel.results': 'Risultati del piano',
  'common.placeholder.inputsTitle': 'Dati del piano',
  'common.placeholder.inputsBody': 'Qui compariranno le sezioni per inserire i dati del piano.',
  'common.placeholder.resultsTitle': 'Risultati',
  'common.placeholder.resultsBody': 'Qui compariranno età FIRE, grafici e analisi.',

  'common.footer.disclaimer':
    'Strumento educativo, non è consulenza finanziaria. Le stime dipendono dalle ipotesi inserite e dalle regole fiscali 2026.',
  'common.footer.privacy': 'I dati restano nel tuo browser.',

  'common.error.title': 'Qualcosa è andato storto in questa sezione',
  'common.error.body': 'I tuoi dati sono al sicuro nel browser. Puoi riprovare oppure esportarli in un file JSON.',
  'common.error.export': 'Esporta i dati',

  'common.ui.help': 'Aiuto',
  'common.ui.helpFor': 'Aiuto: {label}',
  'common.ui.expand': 'Espandi',
  'common.ui.collapse': 'Comprimi',
  'common.ui.invalidNumber': 'Inserisci un numero valido.',
  'common.ui.integerRequired': 'Inserisci un numero intero.',
  'common.ui.belowMin': 'Il valore minimo è {min}.',
  'common.ui.aboveMax': 'Il valore massimo è {max}.',
  'common.ui.notSaved': 'Non salvato: il valore in uso resta {value} (Esc per ripristinarlo).',
  'common.ui.on': 'Attivo',
  'common.ui.off': 'Disattivo',

  'common.level.error': 'Errore',
  'common.level.warning': 'Attenzione',
  'common.level.info': 'Nota',
  'common.level.success': 'Fatto',

  'common.unit.eur': '€',
  'common.unit.eurToday': '€ oggi',
  'common.unit.eurPerMonth': '€/mese',
  'common.unit.eurTodayPerMonth': '€ oggi/mese',
  'common.unit.eurTodayPerYear': '€ oggi/anno',
  'common.unit.pct': '%',
  'common.unit.years': 'anni',
  'common.unit.age': 'anni',
  'common.unit.months': 'mesi',
  'common.unit.runs': 'simulazioni',
};

const en: Record<keyof typeof it, string> = {
  'common.app.name': 'FIRE Planner Italia',
  'common.app.shortName': 'FIRE Planner',
  'common.app.country': 'Italia',
  'common.app.tagline': 'When can I stop working?',
  'common.app.description':
    'When can I stop working? FIRE planner with 2026 Italian taxes, pension fund, TFR, INPS and Monte Carlo.',
  'common.loading': 'Loading…',
  'common.skipToContent': 'Skip to main content',

  'common.actions.cancel': 'Cancel',
  'common.actions.confirm': 'Confirm',
  'common.actions.save': 'Save',
  'common.actions.close': 'Close',
  'common.actions.dismiss': 'Dismiss notice',
  'common.actions.retry': 'Try again',

  'common.plan.selectLabel': 'Plan',
  'common.plan.actions': 'Plan actions',
  'common.plan.new': 'New plan',
  'common.plan.newFromExample': 'Create from an example',
  'common.plan.duplicate': 'Duplicate',
  'common.plan.rename': 'Rename',
  'common.plan.delete': 'Delete',
  'common.plan.copyName': '{name} (copy)',
  'common.plan.renameTitle': 'Rename plan',
  'common.plan.nameLabel': 'Plan name',
  'common.plan.nameRequired': 'The name cannot be empty.',
  'common.plan.deleteTitle': 'Delete this plan?',
  'common.plan.deleteBody':
    'The plan “{name}” will be removed from this browser. Export a JSON file first if you want to keep it.',
  'common.plan.deleteLast': 'At least one plan must remain.',

  'common.example.base': 'Base',
  'common.example.prudent': 'Prudent',
  'common.example.optimistic': 'Optimistic',
  'common.example.baseHint': 'Central assumptions',
  'common.example.prudentHint': 'Lower returns, higher inflation',
  'common.example.optimisticHint': 'Higher returns, lower inflation',

  'common.lang.label': 'Language',
  'common.lang.it': 'IT',
  'common.lang.en': 'EN',
  'common.lang.itName': 'Italiano',
  'common.lang.enName': 'English',

  'common.valueMode.label': 'Displayed values',
  'common.valueMode.real': 'Today’s €',
  'common.valueMode.nominal': 'Nominal',
  'common.valueMode.realHelp': 'Amounts in today’s purchasing power (inflation-adjusted).',
  'common.valueMode.nominalHelp': 'Amounts in the current euros of the year they occur.',

  'common.menu.label': 'Menu',
  'common.menu.open': 'Open menu',
  'common.menu.export': 'Export JSON',
  'common.menu.import': 'Import JSON…',
  'common.menu.reset': 'Reset to examples…',

  'common.import.title': 'Import plans',
  'common.import.planCount.one': '1 plan found in “{file}”.',
  'common.import.planCount.other': '{count} plans found in “{file}”.',
  'common.import.explain': 'They will be added as new plans: your existing plans are not changed or replaced.',
  'common.import.needsFixes': 'Needs fixes',
  'common.import.confirm': 'Import',
  'common.import.messagesTitle': 'Notes about the file',
  'common.import.error.parse': 'The file is not valid JSON.',
  'common.import.error.readFailed': 'The file could not be read.',
  'common.import.error.noPlans': 'The file contains no recognisable plan.',
  'common.import.error.notAPlan': 'Item #{index} is not a plan and will be skipped.',
  'common.import.error.newerVersion':
    'The file comes from a newer version of the app (schema {version}): some data may not be recognised.',
  'common.import.legacyConverted':
    'File from the previous version: its scenarios were converted. Check the data after importing.',

  'common.reset.title': 'Reset to the example plans?',
  'common.reset.body':
    'All your plans will be replaced by the three example plans. A backup copy stays in the browser, but we recommend exporting a JSON file first.',
  'common.reset.confirm': 'Reset',

  'common.notices.label': 'Notices',
  'common.notice.migrated':
    'We converted the data of the previous version ({count} plans). Please check it: v2 adds expenses, ages and pensions.',
  'common.notice.migrationFailed':
    'We found data from the previous version but could not convert it, so we start from the example plans. The old data stays saved in the browser.',
  'common.notice.corrupted':
    'The saved data was unreadable: we kept a copy ({key}) and loaded the example plans.',
  'common.notice.unknownVersion':
    'The saved data comes from another version of the app (schema {version}). We kept a copy ({key}).',
  'common.notice.droppedEntries': 'We skipped {count} saved items that were not plans. Copy of the original data: {key}.',
  'common.notice.backupFailed':
    'A copy of the unreadable data could not be saved: changes made in this session will not be saved, so that it is not overwritten.',
  'common.notice.saveFailed':
    'Could not save in the browser (storage full or private browsing). Changes stay until you close the page: export a JSON file to keep them.',
  'common.notice.storageUnavailable':
    'Browser storage is not available: plans will not be saved. Export a JSON file to keep them.',
  'common.notice.importDone': 'Plans imported: {count}.',
  'common.notice.resetDone': 'Example plans restored. Copy of the previous plans: {key}.',
  'common.notice.resetDoneNoBackup': 'Example plans restored.',

  'common.nav.label': 'Sections',
  'common.nav.inputs': 'Inputs',
  'common.nav.results': 'Results',
  'common.panel.inputs': 'Plan inputs',
  'common.panel.results': 'Plan results',
  'common.placeholder.inputsTitle': 'Plan inputs',
  'common.placeholder.inputsBody': 'The sections to enter your plan data will appear here.',
  'common.placeholder.resultsTitle': 'Results',
  'common.placeholder.resultsBody': 'FI age, charts and analyses will appear here.',

  'common.footer.disclaimer':
    'Educational tool, not financial advice. Estimates depend on your assumptions and on the 2026 tax rules.',
  'common.footer.privacy': 'Your data stays in your browser.',

  'common.error.title': 'Something went wrong in this section',
  'common.error.body': 'Your data is safe in the browser. You can try again or export it to a JSON file.',
  'common.error.export': 'Export data',

  'common.ui.help': 'Help',
  'common.ui.helpFor': 'Help: {label}',
  'common.ui.expand': 'Expand',
  'common.ui.collapse': 'Collapse',
  'common.ui.invalidNumber': 'Enter a valid number.',
  'common.ui.integerRequired': 'Enter a whole number.',
  'common.ui.belowMin': 'The minimum is {min}.',
  'common.ui.aboveMax': 'The maximum is {max}.',
  'common.ui.notSaved': 'Not saved: the value in use is still {value} (Esc to restore it).',
  'common.ui.on': 'On',
  'common.ui.off': 'Off',

  'common.level.error': 'Error',
  'common.level.warning': 'Warning',
  'common.level.info': 'Note',
  'common.level.success': 'Done',

  'common.unit.eur': '€',
  'common.unit.eurToday': 'today’s €',
  'common.unit.eurPerMonth': '€/month',
  'common.unit.eurTodayPerMonth': 'today’s €/month',
  'common.unit.eurTodayPerYear': 'today’s €/year',
  'common.unit.pct': '%',
  'common.unit.years': 'years',
  'common.unit.age': 'years',
  'common.unit.months': 'months',
  'common.unit.runs': 'runs',
};

export const common: { it: Record<string, string>; en: Record<string, string> } = { it, en };
