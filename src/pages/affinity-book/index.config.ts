export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '亲密度图鉴' })
  : { navigationBarTitleText: '亲密度图鉴' }
