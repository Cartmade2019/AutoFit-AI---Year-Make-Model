// Common alignment type
export type Alignment = 'left' | 'center' | 'right';

// ===== Chat Bubble Widget Types =====
export interface ChatBubbleSendButton {
  color: string;
  label: string;
}

export interface ChatBubbleWidgetOptions {
  quick_questions: string[];
  user_icon_url?: string;
  chat_bubble_icon_url: string;
}

export interface ChatBubbleWidgetAppearance {
  bubble_heading: string;
  bubble_heading_text_color: string;
  bubble_heading_background_color: string;
  heading: string;
  subheading: string;
  message_input_placeholder: string;
  text_color: string;
  border_radius: string;
  background_color: string;
  input_background_color: string;
  chat_bubble_background_color: string;
  send_button: ChatBubbleSendButton;
}

export interface ChatBubbleWidgetConfig {
  options: ChatBubbleWidgetOptions;
  appearance: ChatBubbleWidgetAppearance;
}

// ===== Fitment Table Types =====
export interface TableOptions {
  sortable: boolean;
  pagination: boolean;
  searchable: boolean;
  show_title: boolean;
  default_sort: {
    order: 'asc' | 'desc';
  };
  show_subtitle: boolean;
  items_per_page: number;
  show_all_column: boolean;
  expand_on_mobile: boolean;
  number_of_colums: number;
  show_total_count: boolean;
  title_alignment: Alignment;
  subtitle_alignment: Alignment;
}

interface WidgetOptions {
  show_icons: boolean;
  show_title: boolean;
  countries: []
  rate_limit: string;
}

interface WidgetColorsForRegistration {
  text_color: string;
  border_color: string;
  background_color: string;
  primary_button_color: string;
  primary_button_text_color: string;
  input_background_color: string;
}

interface SubmitButtonForRegistration {
  icon: string;
  show: boolean;
  label: string;
}

interface WidgetAppearance {
  title: string;
  placeholder: string;
  colors: WidgetColorsForRegistration;
  layout: "horizontal" | "vertical";
  submit_button: SubmitButtonForRegistration;
}

interface WidgetTranslations {
  no_fit_message: string;
  submit_button_text: string;
  cap_exceed_message: string;
  rate_limit_message: string;
}

export interface RegistrationWidgetConfig {
  options: WidgetOptions;
  appearance: WidgetAppearance;
  translations: WidgetTranslations;
}


export interface TableAppearance {
  heading: string;
  subheading: string;
  text_color: string;
  border_color: string;
  striped_rows: boolean;
  border_radius: string;
  background_color: string;
  header_background: string;
}

export interface TableConfig {
  options: TableOptions;
  appearance: TableAppearance;
}

// ===== Shared types for Fitment-like Widgets =====
export interface WidgetColors {
  text_color: string;
  border_color: string;
  background_color: string;
  primary_button_color: string;
  primary_button_text_color: string;
  secondary_button_color: string;
  secondary_button_text_color: string;
}

export interface ButtonConfig {
  icon: string;
  show: boolean;
  label: string;
}

// ===== Fitment Widget Types =====
export type LayoutHV = 'horizontal' | 'vertical' | 'flex' ;

export interface FitmentWidgetAppearance {
  title: string;
  subtitle: string;
  title_alignment: Alignment;
  subtitle_alignment: Alignment;
  colors: WidgetColors;
  layout: LayoutHV;
  show_icons: boolean;
  show_title: boolean;
  clear_button: ButtonConfig;
  show_subtitle: boolean;
  submit_button_position: 'left' | 'right';
  submit_button: ButtonConfig;
}

export interface FitmentWidgetOptions {
  auto_submit: boolean;
  hide_submit_button: boolean;
  remember_selection: boolean;
  apply_across_collections: boolean;
  search_current_collection: boolean;
  first_view: number;
  display_all_fitment_fields: boolean;
}

export interface FitmentTranslations {
  no_fit_message: string;
  clear_button_text: string;
  submit_button_text: string;
}

export interface FitmentWidgetConfig {
  options: FitmentWidgetOptions;
  appearance: FitmentWidgetAppearance;
  translations: FitmentTranslations;
}

// ===== Verify Fitment Widget Types =====
export interface VerifyWidgetAppearance {
  title: string;
  subtitle: string;
  title_alignment: Alignment;
  subtitle_alignment: Alignment;
  colors: WidgetColors;
  layout: string; // as per current implementation
  show_title: boolean;
  clear_button: ButtonConfig;
  show_subtitle: boolean;
  submit_button: ButtonConfig;
}

export interface VerifyWidgetOptions {
  auto_submit: boolean;
  hide_submit_button: boolean;
  collapse_form: boolean;
  collapse_form_open_by_default: boolean;
  first_view: number;
  display_all_fitment_fields: boolean;
  verify_fitment_widget_icon_url: string;
}

export interface VerifyTranslations {
  no_fit_message: string;
  failure_message: string;
  success_message: string;
  change_selection: string;
  clear_button_text: string;
  submit_button_text: string;
}

export interface VerifyFitmentWidgetConfig {
  options: VerifyWidgetOptions;
  appearance: VerifyWidgetAppearance;
  translations: VerifyTranslations;
}

// ---------- Types ----------
export type GadgetWidgetData = {
  id: string;
  widget_type: string;
  heading: string;
  route: string;
  description: string;
  isActive: boolean; // From Gadget: determines if it shows on the dashboard
  image: string;
  availableToPlan: { plans: string[] };
  __typename: string;
};


export interface GarageWidgetConfig {
  appearance: {
    show_title: boolean;
    show_icons: boolean;
    garage_icon_url: string;
    position: "left" | "right" | "bottom"; 
    colors: {
      text_color: string;
      border_color: string;
      background_color: string;
      primary_button_color: string;
      secondary_button_color: string;
      primary_button_text_color: string;
      secondary_button_text_color: string;
      selected_border_color: string;
      input_background_color: string;
    };
  };
  translations: {
    title: string;
    open_title: string;
    empty_state: string;
    select_vehicle: string;
    add_button: string;
    cancel_button: string;
    add_garage_button: string;
  };
}

export type DashboardWidget = GadgetWidgetData & {
  isEnabled: boolean; // From Supabase: the on/off toggle status
};