export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/novel/index',
    'pages/chat/index',
    'pages/profile/index',
    'pages/graph/index',
    'pages/interact/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f8f5f2',
    navigationBarTitleText: '人设工坊',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#ec4899',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/house.png',
        selectedIconPath: './assets/tabbar/house-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png',
      }
    ]
  }
})
