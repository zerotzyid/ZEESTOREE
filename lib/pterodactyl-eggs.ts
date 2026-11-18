import type { PteroPanel } from './pterodactyl';

/**
 * Nest with eggs from Pterodactyl API
 */
export interface NestWithEggs {
  nestId: number;
  nestName: string;
  nestDescription: string;
  eggs: Array<{
    id: number;
    name: string;
    description: string;
    dockerImage: string;
    startup: string;
    variables: Array<{
      name: string;
      description: string;
      envVariable: string;
      defaultValue: string;
      userViewable: boolean;
      userEditable: boolean;
      rules: string;
    }>;
  }>;
}

/**
 * Egg option for UI selection
 */
export interface EggOption {
  id: number;
  name: string;
  description: string;
  dockerImage: string;
  startup: string;
  nestId: number;
  nestName: string;
  variables: Array<{
    name: string;
    envVariable: string;
    defaultValue: string;
    description: string;
    userViewable: boolean;
    userEditable: boolean;
  }>;
}

/**
 * Fetch all nests with their eggs from Pterodactyl panel
 */
export async function getNestsWithEggs(panel: PteroPanel): Promise<NestWithEggs[]> {
  const baseUrl = panel.baseUrl.replace(/\/$/, '');
  const apiKey = panel.apiKey;

  try {
    // First, get all nests
    const nestsRes = await fetch(`${baseUrl}/api/application/nests?per_page=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!nestsRes.ok) {
      throw new Error(`Failed to fetch nests: ${nestsRes.status}`);
    }

    const nestsData = await nestsRes.json();
    const nests = nestsData.data || [];

    // For each nest, fetch its eggs with variables
    const nestsWithEggs: NestWithEggs[] = [];

    for (const nest of nests) {
      const nestId = nest.attributes.id;
      const nestName = nest.attributes.name;
      const nestDescription = nest.attributes.description || '';

      try {
        const eggsRes = await fetch(`${baseUrl}/api/application/nests/${nestId}/eggs?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!eggsRes.ok) {
          console.warn(`Failed to fetch eggs for nest ${nestId}: ${eggsRes.status}`);
          continue;
        }

        const eggsData = await eggsRes.json();
        const eggs = eggsData.data || [];

        // Fetch detailed egg info with variables for each egg
        const detailedEggs = [];
        for (const egg of eggs) {
          try {
            const eggDetailRes = await fetch(`${baseUrl}/api/application/nests/${nestId}/eggs/${egg.attributes.id}?include=variables`, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            });

            if (eggDetailRes.ok) {
              const eggDetail = await eggDetailRes.json();
              const attrs = eggDetail.attributes || {};
              const variables = eggDetail.relationships?.variables?.data?.map((v: any) => v.attributes) || [];

              detailedEggs.push({
                id: attrs.id,
                name: attrs.name,
                description: attrs.description || '',
                dockerImage: attrs.docker_image || '',
                startup: attrs.startup || '',
                variables: variables.map((v: any) => ({
                  name: v.name,
                  description: v.description || '',
                  envVariable: v.env_variable,
                  defaultValue: v.default_value || '',
                  userViewable: v.user_viewable ?? true,
                  userEditable: v.user_editable ?? true,
                  rules: v.rules || '',
                })),
              });
            } else {
              // Fallback to basic egg info
              detailedEggs.push({
                id: egg.attributes.id,
                name: egg.attributes.name,
                description: egg.attributes.description || '',
                dockerImage: '',
                startup: '',
                variables: [],
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch egg detail for ${egg.attributes.id}:`, e);
          }
        }

        if (detailedEggs.length > 0) {
          nestsWithEggs.push({
            nestId,
            nestName,
            nestDescription,
            eggs: detailedEggs,
          });
        }
      } catch (e) {
        console.warn(`Failed to process nest ${nestId}:`, e);
      }
    }

    return nestsWithEggs;
  } catch (error) {
    console.error('Error fetching nests with eggs:', error);
    throw error;
  }
}

/**
 * Transform nests with eggs to flat egg options for UI
 */
export function formatEggsForUI(nests: NestWithEggs[]): EggOption[] {
  const options: EggOption[] = [];

  for (const nest of nests) {
    for (const egg of nest.eggs) {
      options.push({
        id: egg.id,
        name: egg.name,
        description: egg.description,
        dockerImage: egg.dockerImage,
        startup: egg.startup,
        nestId: nest.nestId,
        nestName: nest.nestName,
        variables: egg.variables.map(v => ({
          name: v.name,
          envVariable: v.envVariable,
          defaultValue: v.defaultValue,
          description: v.description,
          userViewable: v.userViewable,
          userEditable: v.userEditable,
        })),
      });
    }
  }

  return options;
}

/**
 * Group eggs by nest for UI display
 */
export function groupEggsByNest(eggs: EggOption[]): Record<string, EggOption[]> {
  const grouped: Record<string, EggOption[]> = {};

  for (const egg of eggs) {
    const nestKey = egg.nestName;
    if (!grouped[nestKey]) {
      grouped[nestKey] = [];
    }
    grouped[nestKey].push(egg);
  }

  return grouped;
}

/**
 * Get panel configuration for egg provisioning
 */
export function getPanelConfig(panelId: string) {
  // This would be fetched from settings
  // For now, return default panel config
  return {
    panelId,
    // Other config will be merged from panel type provision
  };
}