export const UCMConfig = {
  baseUrl: process.env.UCM_API_BASE_URL ?? '',
  cdrapiUrl: process.env.UCM_CDR_API_URL ?? '',
  recapiUrl: process.env.UCM_REC_API_URL ?? '',
  user: process.env.UCM_API_USER ?? '',
  password: process.env.UCM_API_PASS ?? '',
  version: '1.0',
};
