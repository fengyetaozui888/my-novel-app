export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '3D互动', navigationStyle: 'custom' })
  : { navigationBarTitleText: '3D互动', navigationStyle: 'custom' }
