export type Lang = "ar" | "en";

export const translations = {
  ar: {
    nav: {
      learn: "تعلّم",
      dashboard: "لوحتي",
      subscription: "الاشتراك",
      admin: "إدارة",
      support: "الدعم",
    },
    auth: {
      login: "دخول",
      register: "تسجيل الدخول",
      logout: "خروج",
      logoutFull: "تسجيل الخروج",
    },
    gems: {
      free: "مجانية",
      todayLimit: "اليوم",
      subscribe: "اشترك للمتابعة",
      lastDay: "آخر يوم",
      subjects: "مواد",
    },
    footer: {
      rights: "جميع الحقوق محفوظة",
    },
    lang: {
      switchTo: "Switch to English",
      current: "AR",
    },
  },
  en: {
    nav: {
      learn: "Learn",
      dashboard: "My Board",
      subscription: "Subscription",
      admin: "Admin",
      support: "Support",
    },
    auth: {
      login: "Login",
      register: "Sign In",
      logout: "Logout",
      logoutFull: "Sign Out",
    },
    gems: {
      free: "free",
      todayLimit: "today",
      subscribe: "Subscribe",
      lastDay: "Last Day",
      subjects: "subjects",
    },
    footer: {
      rights: "All rights reserved",
    },
    lang: {
      switchTo: "التبديل للعربية",
      current: "EN",
    },
  },
} as const;

export type Translations = typeof translations.ar;
