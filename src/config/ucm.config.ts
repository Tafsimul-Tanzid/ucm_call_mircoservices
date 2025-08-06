export const UCMConfig = {
  baseUrl:
    process.env.UCM_API_BASE_URL?.trim() ?? 'https://103.139.234.50:8089/api',
  cdrapiUrl: process.env.UCM_CDR_API_URL?.trim() ?? '',
  recapiUrl: process.env.UCM_REC_API_URL?.trim() ?? '',
  user: process.env.UCM_API_USER ?? '',
  password: process.env.UCM_API_PASS ?? '',
  version: '1.0',
};
