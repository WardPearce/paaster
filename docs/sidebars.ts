import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'architecture',
    {
      type: 'category',
      label: 'Storage Backends',
      items: ['storage-backends'],
    },
    {
      type: 'category',
      label: 'Upload & Encryption',
      items: ['chunked-uploads', 'client-side-encryption'],
    },
    {
      type: 'category',
      label: 'API',
      items: ['api/paste', 'api/account'],
    },
    'configuration',
    'development',
  ],
  deploymentSidebar: [
    {
      type: 'category',
      label: 'Deployment',
      items: ['deployment/mongodb', 'deployment/s3', 'deployment/filesystem'],
    },
    'configuration',
  ],
};

export default sidebars;
