/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    'mongodb',
    'mongodb/lib/client-side-encryption/mongocryptd_manager.js',
    'mongodb/lib/cmap/auth/gssapi.js',
    'mongodb/lib/connection_string.js',
    'mongodb/lib/sdam/srv_polling.js',
    'mongodb/lib/cmap/auth/mongodb_oidc/token_machine_workflow.js',
    'mongodb/lib/mongo_client.js',
    'mongodb/lib/utils.js',
    'mongodb/lib/client-side-encryption/state_machine.js',
    'mongodb/lib/cmap/auth/mongodb_oidc/k8s_machine_workflow.js',
    'mongodb/lib/client-side-encryption/auto_encrypter.js',
    'mongodb/lib/cmap/auth/mongodb_oidc/callback_workflow.js',
    'mongodb/lib/operations/execute_operation.js',
    'mongodb/lib/sessions.js',
    './node_modules/mongodb/lib/cmap/auth/mongodb_oidc/callback_workflow.js',
    './node_modules/mongodb/lib/operations/execute_operation.js',
    './node_modules/mongodb/lib/sessions.js'
  ],
};

export default nextConfig;
