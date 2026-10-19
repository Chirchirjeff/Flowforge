/**
 * IG SACCO loan process distilled from the Business Analysis Report, revision 1.
 * Amount bands use strict comparisons because the report does not define the
 * exact KSh 100,000 and KSh 1,000,000 boundaries.
 */

type LoanNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

type LoanEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  label?: string;
};

const nodes: LoanNode[] = [];
const edges: LoanEdge[] = [];

function node(id: string, type: string, x: number, y: number, config: Record<string, unknown> = {}) {
  nodes.push({ id, type, position: { x, y }, config });
}

function connect(source: string, target: string, sourceHandle = 'out', label?: string) {
  edges.push({
    id: `${source}-${sourceHandle}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle: 'in',
    ...(label ? { label } : {}),
  });
}

function task(id: string, title: string, role: string, description: string, x: number, y: number) {
  node(id, 'user-task', x, y, {
    title,
    description,
    assignmentType: 'role',
    assignmentValue: role,
    priority: '1',
  });
}

function approval(id: string, title: string, role: string, description: string, x: number, y: number) {
  node(id, 'approval', x, y, {
    title,
    description,
    assignmentType: 'role',
    assignmentValue: role,
    allowComment: true,
    priority: '1',
  });
}

function decision(id: string, field: string, operator: string, value: string | number | boolean, x: number, y: number) {
  node(id, 'condition', x, y, { field, operator, value });
}

function returnTo(id: string, previousStep: string, x: number, y: number) {
  node(id, 'return', x, y, { requireComment: true });
  connect(id, previousStep);
}

node('loan-start', 'start', 60, 330);
task(
  'reception-screening',
  'Receive and screen loan application',
  'Receptionist',
  'Check the signed loan form and required supporting documents: payslip or employment letter, ID, bank or M-Pesa statements, KRA PIN, and guarantor details. Capture member number and ID number.',
  300,
  330,
);
decision('documents-complete', 'documentsComplete', 'equals', true, 560, 330);
node('missing-documents-return', 'return', 820, 510, { requireComment: true });
task(
  'loan-registration',
  'Register loan and capture loan number',
  'Receptionist',
  'Register the application with the Core Banking System. Capture the generated loan number, member number, ID number, loan product, amount, and supporting record links.',
  820,
  260,
);
decision('private-business-applicant', 'applicantType', 'equals', 'PRIVATE_BUSINESS', 1080, 260);
task(
  'accounts-assistant-check',
  'Verify private or business application',
  'Accounts Assistant',
  'For private employees and business members, verify the application and continue processing according to the loan amount.',
  1340,
  100,
);
decision('small-loan-limit', 'loan.amount', 'lt', 100000, 1340, 360);

// Branch-level loans under KSh 100,000.
approval(
  'branch-manager-approval',
  'Approve and disburse branch loan',
  'Branch Manager',
  'The report assigns branch approval and disbursement to the Branch Manager for amounts below KSh 100,000 per day.',
  1600,
  30,
);
returnTo('branch-approval-return', 'loan-registration', 1860, 150);

// Main-office loans: over KSh 1,000,000 follow the senior approval chain.
decision('large-loan-limit', 'loan.amount', 'gt', 1000000, 1600, 400);
task(
  'credit-manager-appraisal',
  'Appraise loan above KSh 1,000,000',
  'Credit Manager',
  'Review CRB status, assess eligibility and the appraised amount, and prepare the application for Finance Manager approval.',
  1860,
  340,
);
approval(
  'finance-manager-approval',
  'Approve high-value loan',
  'Finance Manager',
  'Approve or return the Credit Manager appraisal. The report notes that Finance Manager and CEO roles may be interchangeable for approval and verification.',
  2120,
  300,
);
returnTo('finance-approval-return', 'credit-manager-appraisal', 2380, 430);
approval(
  'ceo-verification',
  'Verify high-value loan',
  'CEO',
  'Verify the approved application and supporting documents. The report allows the Finance Manager and CEO to interchange verification and approval roles.',
  2380,
  260,
);
returnTo('ceo-verification-return', 'finance-manager-approval', 2640, 390);
approval(
  'high-value-disbursement',
  'Disburse high-value loan',
  'Finance Manager',
  'Record disbursement by Finance Manager or CEO as permitted by IG SACCO policy.',
  2640,
  220,
);
returnTo('high-disbursement-return', 'ceo-verification', 2900, 350);

// Main-office loans up to KSh 1,000,000 and at least KSh 100,000.
task(
  'credit-officer-appraisal',
  'Appraise loan up to KSh 1,000,000',
  'Credit Officer',
  'Check CRB status, calculate the eligible amount, verify prequalification and supporting documents, then batch the application.',
  1860,
  620,
);
approval(
  'credit-officer-approval',
  'Approve appraised loan',
  'Credit Officer',
  'Approve the appraisal or return the application for correction.',
  2120,
  610,
);
returnTo('credit-officer-approval-return', 'credit-officer-appraisal', 2380, 740);
approval(
  'credit-manager-verification',
  'Verify loan batch',
  'Credit Manager',
  'Complete the final batch verification before routing the application for disbursement.',
  2380,
  570,
);
returnTo('credit-manager-verification-return', 'credit-officer-approval', 2640, 700);
approval(
  'standard-disbursement',
  'Disburse main-office loan',
  'Savings Manager',
  'Record disbursement by the Savings Manager, Finance Manager or CEO according to the configured SACCO delegation.',
  2640,
  540,
);
returnTo('standard-disbursement-return', 'credit-manager-verification', 2900, 680);

// Common post-disbursement controls and committee approval.
task(
  'audit-batch-verification',
  'Verify batched loan applications',
  'Audit Manager',
  'Verify the batched loan applications and confirm the supporting records before committee review and filing.',
  3160,
  330,
);
decision('loan-category', 'loan.category', 'equals', 'BOSA', 3420, 330);
approval(
  'bosa-credit-committee',
  'Review BOSA loan batch',
  'BOSA Credit Committee',
  'Review the BOSA loan batch. The report describes committee verification monthly.',
  3680,
  200,
);
returnTo('bosa-committee-return', 'audit-batch-verification', 3940, 330);
approval(
  'fosa-credit-committee',
  'Review FOSA loan batch',
  'FOSA Credit Committee',
  'Review the FOSA loan batch. The report describes committee verification monthly.',
  3680,
  500,
);
returnTo('fosa-committee-return', 'audit-batch-verification', 3940, 630);
task(
  'credit-manager-core-banking-update',
  'Update Core Banking and loan registers',
  'Credit Manager',
  'After committee approval, update the loan in Core Banking and maintain the loan book, non-performing loan, and repaid loan registers.',
  4200,
  330,
);
task(
  'registry-filing',
  'File loan records',
  'Registry',
  'Countercheck and file the approved loan form and supporting documents in the member record.',
  4460,
  330,
);
node('loan-completed', 'end', 4720, 250, { outcome: 'completed', message: 'Loan processing is complete.' });

node('loan-rejection-notice', 'notification', 3160, 900, {
  recipient: 'initiator',
  channel: 'email',
  subject: 'Loan application not approved',
  message: 'Your loan application {{loanNumber}} was not approved. Please contact IG SACCO for details.',
});
node('loan-rejected', 'end', 3420, 900, {
  outcome: 'rejected',
  message: 'The loan application was not approved.',
});

connect('loan-start', 'reception-screening');
connect('reception-screening', 'documents-complete');
connect('documents-complete', 'loan-registration', 'true', 'Complete');
connect('documents-complete', 'missing-documents-return', 'false', 'Missing documents');
connect('missing-documents-return', 'reception-screening');
connect('loan-registration', 'private-business-applicant');
connect('private-business-applicant', 'accounts-assistant-check', 'true', 'Private / business');
connect('private-business-applicant', 'small-loan-limit', 'false', 'TSC / Government');
connect('accounts-assistant-check', 'small-loan-limit');
connect('small-loan-limit', 'branch-manager-approval', 'true', 'Below KSh 100,000');
connect('small-loan-limit', 'large-loan-limit', 'false', 'KSh 100,000 or more');
connect('large-loan-limit', 'credit-manager-appraisal', 'true', 'Above KSh 1,000,000');
connect('large-loan-limit', 'credit-officer-appraisal', 'false', 'KSh 1,000,000 or less');

connect('branch-manager-approval', 'audit-batch-verification', 'approved', 'Approved / disbursed');
connect('branch-manager-approval', 'branch-approval-return', 'returned', 'Return');
connect('branch-manager-approval', 'loan-rejection-notice', 'rejected', 'Rejected');

connect('credit-manager-appraisal', 'finance-manager-approval');
connect('finance-manager-approval', 'ceo-verification', 'approved', 'Approved');
connect('finance-manager-approval', 'finance-approval-return', 'returned', 'Return');
connect('finance-manager-approval', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('ceo-verification', 'high-value-disbursement', 'approved', 'Verified');
connect('ceo-verification', 'ceo-verification-return', 'returned', 'Return');
connect('ceo-verification', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('high-value-disbursement', 'audit-batch-verification', 'approved', 'Disbursed');
connect('high-value-disbursement', 'high-disbursement-return', 'returned', 'Return');
connect('high-value-disbursement', 'loan-rejection-notice', 'rejected', 'Rejected');

connect('credit-officer-appraisal', 'credit-officer-approval');
connect('credit-officer-approval', 'credit-manager-verification', 'approved', 'Approved');
connect('credit-officer-approval', 'credit-officer-approval-return', 'returned', 'Return');
connect('credit-officer-approval', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('credit-manager-verification', 'standard-disbursement', 'approved', 'Verified');
connect('credit-manager-verification', 'credit-manager-verification-return', 'returned', 'Return');
connect('credit-manager-verification', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('standard-disbursement', 'audit-batch-verification', 'approved', 'Disbursed');
connect('standard-disbursement', 'standard-disbursement-return', 'returned', 'Return');
connect('standard-disbursement', 'loan-rejection-notice', 'rejected', 'Rejected');

connect('audit-batch-verification', 'loan-category');
connect('loan-category', 'bosa-credit-committee', 'true', 'BOSA');
connect('loan-category', 'fosa-credit-committee', 'false', 'FOSA');
connect('bosa-credit-committee', 'credit-manager-core-banking-update', 'approved', 'Approved');
connect('bosa-credit-committee', 'bosa-committee-return', 'returned', 'Return');
connect('bosa-credit-committee', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('fosa-credit-committee', 'credit-manager-core-banking-update', 'approved', 'Approved');
connect('fosa-credit-committee', 'fosa-committee-return', 'returned', 'Return');
connect('fosa-credit-committee', 'loan-rejection-notice', 'rejected', 'Rejected');
connect('credit-manager-core-banking-update', 'registry-filing');
connect('registry-filing', 'loan-completed');
connect('loan-rejection-notice', 'loan-rejected');

export const IG_SACCO_LOAN_GRAPH = { nodes, edges };
export const IG_SACCO_LOAN_DESCRIPTION =
  'IG SACCO loan approval process based on the Business Analysis Report (revision 1), Credit Department section. It covers reception screening, applicant category, amount-based appraisal and approval, disbursement, audit, BOSA/FOSA committee review, Core Banking update, and registry filing. Amounts exactly KSh 100,000 and KSh 1,000,000 follow the middle band because the report does not specify boundary handling. Role names and core-banking integration values may need mapping to the organization’s actual accounts.';
