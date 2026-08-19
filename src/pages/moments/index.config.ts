export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '朋友圈',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black'
    })
  : {
      navigationBarTitleText: '朋友圈',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black'
    }
