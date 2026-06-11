/* pad-type.js — Pad class (field | work | note | plan) helpers.
   record_class is metadata: never sealed, always used to route UI. */

var PadType = (function () {
  'use strict';

  var KEY = {
    FIELD: 'field',
    WORK:  'work',
    NOTE:  'note',
    PLAN:  'plan',
  };

  var LABEL = {
    field: 'Field',
    work:  'Work',
    note:  'Memo',
    plan:  'Plan',
  };

  var SHARE_LABEL = {
    field: 'field visit',
    work:  'workpad',
    note:  'memo',
    plan:  'plan',
  };

  /** Resolve pad class from a record. Defaults to work for legacy records. */
  function of(record) {
    if (!record) return KEY.WORK;
    return record.record_class || KEY.WORK;
  }

  function isWork(record) {
    return of(record) === KEY.WORK;
  }

  /** Work pads only — expenses, payments, charge types, job-notes sidebar. */
  function hasFinancials(record) {
    if (!record || record.parentId) return false;
    if (record.recordType === 'expense' || record.recordType === 'payment') return false;
    return isWork(record);
  }

  function label(record) {
    return LABEL[of(record)] || 'Work';
  }

  function shareLabel(record) {
    return SHARE_LABEL[of(record)] || 'workpad';
  }

  /** Wizard / edit: honour explicit padType param, else record metadata. */
  function forWizard(record, padTypeParam) {
    if (padTypeParam) return padTypeParam;
    return of(record);
  }

  return {
    KEY: KEY,
    LABEL: LABEL,
    SHARE_LABEL: SHARE_LABEL,
    of: of,
    isWork: isWork,
    hasFinancials: hasFinancials,
    label: label,
    shareLabel: shareLabel,
    forWizard: forWizard,
  };
}());
