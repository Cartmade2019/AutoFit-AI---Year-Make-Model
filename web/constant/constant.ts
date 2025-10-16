import {
  BookIcon,
  LockIcon,
  MegaphoneIcon,
  BugIcon
} from '@shopify/polaris-icons'
import React from 'react'

export const yearOptions = [
    { label: "2022", value: "2022" },
    { label: "2023", value: "2023" },
    { label: "2024", value: "2024" },
    { label: "2025", value: "2025" },
  ];

  export const makeOptions = [
    { label: "Honda", value: "Honda" },
    { label: "Toyota", value: "Toyota" },
    { label: "Ford", value: "Ford" },
  ];

  export const modelOptions = [
    { label: "Civic", value: "Civic" },
    { label: "Accord", value: "Accord" },
    { label: "CR-V", value: "CR-V" },
  ];

  export const engineOptions = [
    { label: "1.5L", value: "1.5L" },
    { label: "2.0L", value: "2.0L" },
    { label: "3.0L", value: "3.0L" },
  ];

 export const sections = [
  // {
  //   icon: BookIcon,
  //   title: "User guide",
  //   description: "Find answers to your problems with our detailed instructions.",
  //   link: "#",
  // },
  {
    icon: LockIcon,
    title: "Privacy policy",
    description: "Read how we handle your customer data.",
    link: "https://autofitai.app/pages/autofit-ai-privacy-policy",
    isExternal: true,
  },
  {
    icon: MegaphoneIcon,
    title: "Feature requests",
    description: "Send us your ideas to improve the app and add functionality.",
    link: "/help",
    isExternal: false,
  },
  // {
  //   icon: BugIcon,
  //   title: "Release notes",
  //   description: "Check out the latest release notes and updates to the app.",
  //   link: "#",
  // },
];

interface CheckListItem {
   id: string;
   label: string;
   description: string;
  
}

export const checklistItems: CheckListItem[] = [
  { id: "activateApp", label: "Active your app" , description: "To Start Using AI-YMM APP, first activate in your Shopify Admin. Activation is required for all the features. Go to theme customization and under the app embeded toggle the AI-YMM APP to activate."  },
  { id: "activateWidgets", label: "Activate your widgets" , description: "Turn on all required widgets in the app settings."  },
  { id: "fillDatabase", label: "Fill your database" , description: "Add your store's data to complete the setup and get the app fully functional." },
];


