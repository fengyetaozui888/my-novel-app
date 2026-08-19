export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '人设模拟',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '人设模拟',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    }
