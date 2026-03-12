export const REGION_TREE = {
  'Tamil Nadu': {
    Chennai: {
      'T Nagar': {
        center: [80.2341, 13.0418],
        bbox: [80.214, 13.027, 80.258, 13.061]
      },
      Adyar: {
        center: [80.2579, 13.0067],
        bbox: [80.233, 12.987, 80.279, 13.023]
      },
      Velachery: {
        center: [80.2206, 12.9752],
        bbox: [80.201, 12.958, 80.244, 12.991]
      },
      'Anna Nagar': {
        center: [80.2102, 13.0878],
        bbox: [80.189, 13.069, 80.232, 13.103]
      },
      Ambattur: {
        center: [80.1548, 13.1143],
        bbox: [80.131, 13.091, 80.178, 13.131]
      }
    }
  }
};

export const DEFAULT_REGION = {
  state: 'Tamil Nadu',
  district: 'Chennai',
  area: 'T Nagar'
};

export const getDistricts = (state) => Object.keys(REGION_TREE[state] || {});
export const getAreas = (state, district) => Object.keys(REGION_TREE[state]?.[district] || {});

export const getAreaConfig = (state, district, area) =>
  REGION_TREE[state]?.[district]?.[area] || REGION_TREE[DEFAULT_REGION.state][DEFAULT_REGION.district][DEFAULT_REGION.area];
