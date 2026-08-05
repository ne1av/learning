const body = {
  data: {
    env: {
      projectId: "slidebox-ios-prod",
      region: "us-central1",
      function: "validateReceipt",
      realm: "prod"
    },
    appStoreRecord: {
      purchases: [
        {
          productId: "com.slidebox.premium.lifetime"
        }
      ],
      subscriptions: [],
      // 建議使用當前時間戳，避免被服務端校驗
      validatedTimestampMs: String(Date.now()),
      bundleId: "com.slidebox.app"
    }
  }
};

$done({
  body: JSON.stringify(body)
});
