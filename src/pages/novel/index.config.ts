export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '世界',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '世界',
      navigationBarBackgroundColor: '#f8f5f2',
      navigationBarTextStyle: 'black',
    }
