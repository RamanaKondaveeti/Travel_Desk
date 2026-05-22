
import React, { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CaseSensitive,
  Clipboard,
  Copy,
  FileText,
  Flag,
  Globe,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Maximize2,
  Omega,
  Paintbrush,
  Printer,
  Quote,
  Redo2,
  Save,
  Scissors,
  Search,
  SpellCheck,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  TextCursorInput,
  Underline,
  Unlink2,
  Undo2,
} from "lucide-react";
import {
  FaAlignJustify,
  FaCheckSquare,
  FaCode,
  FaDotCircle,
  FaEraser,
  FaFile,
  FaFont,
  FaLanguage,
  FaParagraph,
  FaPaste,
  FaQuestionCircle,
  FaSmile,
  FaSquare,
  FaThLarge,
  FaTint,
} from "react-icons/fa";
import "./AddOffer.css";
import { createAdminFeaturedOffer } from "../../../services/adminFeaturedOffersService";

const BOOKING_TYPE_OPTIONS = [
  { value: "Bus", label: "Bus" },
  { value: "Flight", label: "Flight" },
  { value: "Hotel", label: "Hotel" },
];

const DEFAULT_FORM = {
  title: "",
  couponCode: "",
  bookingType: "Bus",
  isActive: true,
  couponExpiresAtUtc: "",
  shortDescription: "",
  longDescription: "",
  offerCode: "",
  basePrice: "",
  isPercentageDiscount: false,
  discountValue: "",
  maxCouponUsage: "",
};



const PRIMARY_EDITOR_TOOL_GROUPS = [
  [
    { label: "Source", kind: "text", icon: FaCode },
    { label: "Save", icon: Save },
    { label: "New Document", icon: FileText },
    { label: "Preview", icon: Search },
    { label: "Print", icon: Printer },
    { label: "Templates", icon: FaFile },
  ],
  [
    { label: "Cut", icon: Scissors },
    { label: "Copy", icon: Copy },
    { label: "Paste", icon: FaPaste },
    { label: "Paste as text", icon: Clipboard },
    { label: "Paste from Word", icon: Clipboard },
  ],
  [
    { label: "Undo", icon: Undo2 },
    { label: "Redo", icon: Redo2 },
  ],
  [
    { label: "Find", icon: Search },
    { label: "Replace", icon: SpellCheck },
  ],
  [
    { label: "Forms", icon: FaThLarge },
    { label: "Checkbox", icon: FaCheckSquare },
    { label: "Radio button", icon: FaDotCircle },
    { label: "Text field", icon: TextCursorInput },
    { label: "Textarea", icon: FaParagraph },
    { label: "Select field", icon: FaSquare },
    { label: "Button", icon: Baseline },
    { label: "Hidden field", icon: CaseSensitive },
  ],
];

const SECONDARY_EDITOR_SELECTS = [
  {
    ariaLabel: "Styles",
    options: ["Styles", "Paragraph", "Heading 1", "Heading 2"],
  },
  {
    ariaLabel: "Format",
    options: ["Format", "Normal", "Code", "Blockquote"],
  },
  {
    ariaLabel: "Font",
    options: ["Font", "Arial", "Georgia", "Verdana"],
  },
  {
    ariaLabel: "Size",
    options: ["Size", "12", "14", "16", "18"],
  },
];

const SECONDARY_EDITOR_TOOL_GROUPS = [
  [
    { label: "Bold", icon: Bold },
    { label: "Italic", icon: Italic },
    { label: "Underline", icon: Underline },
    { label: "Strikethrough", icon: Strikethrough },
    { label: "Subscript", icon: Subscript },
    { label: "Superscript", icon: Superscript },
    { label: "Clear formatting", icon: FaEraser },
    { label: "Special characters", icon: Omega },
  ],
  [
    { label: "Text styles", icon: Paintbrush },
    { label: "Text tools", icon: TextCursorInput },
    { label: "Numbered list", icon: ListOrdered },
    { label: "Bulleted list", icon: List },
    { label: "Decrease indent", icon: ListIndentDecrease },
    { label: "Increase indent", icon: ListIndentIncrease },
    { label: "Quote", icon: Quote },
  ],
  [
    { label: "Align left", icon: AlignLeft },
    { label: "Align center", icon: AlignCenter },
    { label: "Align right", icon: AlignRight },
    { label: "Justify", icon: FaAlignJustify },
  ],
  [
    { label: "Language", icon: FaLanguage },
    { label: "Link", icon: Link2 },
    { label: "Unlink", icon: Unlink2 },
    { label: "Anchor", icon: Flag },
    { label: "Image", icon: ImageIcon },
    { label: "Globe", icon: Globe },
    { label: "Table", icon: Table2 },
    { label: "Emoji", icon: FaSmile },
  ],
];

const TERTIARY_EDITOR_TOOL_GROUPS = [
  [
    { label: "Text color", icon: FaFont },
    { label: "Background color", icon: FaTint },
    { label: "Fullscreen", icon: Maximize2 },
    { label: "Show blocks", icon: FaThLarge },
    { label: "Help", icon: FaQuestionCircle },
  ],
];

function toUtcIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildOfferFormData(formValues, fileInputObject) {
  const formData = new FormData();
  formData.append("Title", String(formValues.title || "").trim());
  formData.append("BookingType", formValues.bookingType);
  formData.append("IsActive", Boolean(formValues.isActive));
  
  if (formValues.offerCode !== undefined && formValues.offerCode !== null) {
    formData.append("OfferCode", String(formValues.offerCode).trim());
  }
  if (formValues.couponCode !== undefined && formValues.couponCode !== null) {
    formData.append("CouponCode", String(formValues.couponCode).trim());
  }
  if (formValues.shortDescription !== undefined && formValues.shortDescription !== null) {
    formData.append("Subtitle", String(formValues.shortDescription).trim());
  }
  if (formValues.longDescription !== undefined && formValues.longDescription !== null) {
    formData.append("Description", String(formValues.longDescription).trim());
  }
  
  if (formValues.couponExpiresAtUtc) {
    formData.append("CouponExpiresAtUtc", toUtcIso(formValues.couponExpiresAtUtc));
  }
  
  if (formValues.basePrice !== undefined && formValues.basePrice !== null && formValues.basePrice !== "") {
    formData.append("BasePrice", Number(formValues.basePrice));
  }
  formData.append("IsPercentageDiscount", Boolean(formValues.isPercentageDiscount));
  
  if (formValues.discountValue !== undefined && formValues.discountValue !== null && formValues.discountValue !== "") {
    formData.append("DiscountValue", Number(formValues.discountValue));
  }
  
  if (formValues.maxCouponUsage !== undefined && formValues.maxCouponUsage !== null && formValues.maxCouponUsage !== "") {
    formData.append("MaxCouponUsage", Number(formValues.maxCouponUsage));
  }
  
  formData.append("CouponUsedCount", 0);
  
  if (fileInputObject) {
    formData.append("Image", fileInputObject);
  }
  
  return formData;
}

export default function AdminAddOfferPage({ onBack }) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    const value = field === "isActive" ? event.target.value === "active" : event.target.value;
    setFormValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setFormError("");

    const title = String(formValues.title || "").trim();
    if (!title) {
      setFormError("Offer name is required.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = buildOfferFormData(formValues, selectedFile);
      await createAdminFeaturedOffer(formData);
      setFormValues(DEFAULT_FORM);
      setSelectedFile(null);
      setSaved(true);
      if (onBack) {
        onBack();
      }
    } catch (requestError) {
      setFormError(requestError.message || "Unable to create offer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flight-markup-panel offer-add-page">
      <header className="flight-markup-toolbar offer-add-page-toolbar">
        <div className="flight-markup-title">
          <h1>
            <strong>Add</strong> Offer
          </h1>
          <div className="flight-markup-title-underline" aria-hidden="true" />
        </div>

        {onBack && (
          <div className="flight-markup-actions">
            <button
              type="button"
              className="flight-markup-action-btn primary offer-add-list-btn"
              onClick={onBack}
            >
              <List size={16} />
              <span>Offer List</span>
            </button>
          </div>
        )}
      </header>

      <section className="menu-form-shell offer-add-shell">
        <form className="offer-add-form" onSubmit={handleSubmit}>
          <div className="offer-add-grid">
            <label className="offer-add-label" htmlFor="offer-name">
              Offer Name (Title) <span aria-hidden="true">*</span>
            </label>
            <div className="offer-add-control">
              <input
                id="offer-name"
                type="text"
                placeholder="Enter offer name"
                value={formValues.title}
                onChange={handleChange("title")}
                required
              />
            </div>

            <label className="offer-add-label" htmlFor="offer-code">
              Offer Code
            </label>
            <div className="offer-add-control">
              <input
                id="offer-code"
                type="text"
                placeholder="e.g. BUS2026"
                value={formValues.offerCode}
                onChange={handleChange("offerCode")}
              />
            </div>

            <label className="offer-add-label" htmlFor="booking-type">
              Booking Type <span aria-hidden="true">*</span>
            </label>
            <div className="offer-add-control">
              <select
                id="booking-type"
                value={formValues.bookingType}
                onChange={handleChange("bookingType")}
                required
              >
                {BOOKING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="offer-add-label" htmlFor="offer-status">
              Status
            </label>
            <div className="offer-add-control">
              <select
                id="offer-status"
                value={formValues.isActive ? "active" : "inactive"}
                onChange={handleChange("isActive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <label className="offer-add-label" htmlFor="coupon-code">
              Coupon Code
            </label>
            <div className="offer-add-control">
              <input
                id="coupon-code"
                type="text"
                placeholder="Enter coupon code"
                value={formValues.couponCode}
                onChange={handleChange("couponCode")}
              />
            </div>

            <label className="offer-add-label" htmlFor="coupon-expires">
              Coupon Expires
            </label>
            <div className="offer-add-control">
              <input
                id="coupon-expires"
                type="datetime-local"
                value={formValues.couponExpiresAtUtc}
                onChange={handleChange("couponExpiresAtUtc")}
              />
            </div>

            <label className="offer-add-label" htmlFor="base-price">
              Base Price (INR)
            </label>
            <div className="offer-add-control">
              <input
                id="base-price"
                type="number"
                placeholder="e.g. 1000"
                value={formValues.basePrice}
                onChange={handleChange("basePrice")}
              />
            </div>

            <label className="offer-add-label" htmlFor="discount-type">
              Discount Type
            </label>
            <div className="offer-add-control">
              <select
                id="discount-type"
                value={formValues.isPercentageDiscount ? "percentage" : "flat"}
                onChange={(event) =>
                  setFormValues((previous) => ({
                    ...previous,
                    isPercentageDiscount: event.target.value === "percentage",
                  }))
                }
              >
                <option value="flat">Flat Discount</option>
                <option value="percentage">Percentage Discount</option>
              </select>
            </div>

            <label className="offer-add-label" htmlFor="discount-value">
              Discount Value
            </label>
            <div className="offer-add-control">
              <input
                id="discount-value"
                type="number"
                placeholder="e.g. 50 or 500"
                value={formValues.discountValue}
                onChange={handleChange("discountValue")}
              />
            </div>

            <label className="offer-add-label" htmlFor="max-coupon-usage">
              Max Coupon Usage
            </label>
            <div className="offer-add-control">
              <input
                id="max-coupon-usage"
                type="number"
                placeholder="e.g. 500"
                value={formValues.maxCouponUsage}
                onChange={handleChange("maxCouponUsage")}
              />
            </div>

            <label className="offer-add-label" htmlFor="offer-image-file">
              Image Upload
            </label>
            <div className="offer-add-control">
              <input
                id="offer-image-file"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  if (event.target.files && event.target.files[0]) {
                    setSelectedFile(event.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          <div className="offer-add-section-bar">
            <span>Short Description</span>
          </div>
          <textarea
            className="offer-add-short-textarea"
            placeholder="Write the short description..."
            value={formValues.shortDescription}
            onChange={handleChange("shortDescription")}
          />

          <div className="offer-add-section-bar">
            <span>Long Description</span>
          </div>
          <section className="offer-add-editor-shell" aria-label="Long description editor">
            <div className="offer-add-editor-toolbar offer-add-editor-toolbar-primary">
              {PRIMARY_EDITOR_TOOL_GROUPS.map((group, groupIndex) => (
                <div key={`primary-group-${groupIndex}`} className="offer-add-editor-toolbar-group">
                  {group.map((tool) => {
                    const Icon = tool.icon;
                    const isTextTool = tool.kind === "text";

                    return (
                      <button
                        key={`${tool.label}-${groupIndex}`}
                        type="button"
                        className={`offer-add-editor-btn${isTextTool ? " text" : " icon-only"}`}
                        aria-label={tool.label}
                        title={tool.label}
                      >
                        {Icon ? <Icon size={15} /> : null}
                        {isTextTool ? <span>{tool.label}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="offer-add-editor-toolbar offer-add-editor-toolbar-secondary">
              {SECONDARY_EDITOR_TOOL_GROUPS.map((group, groupIndex) => (
                <div key={`secondary-group-${groupIndex}`} className="offer-add-editor-toolbar-group">
                  {group.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <button
                        key={`${tool.label}-${groupIndex}`}
                        type="button"
                        className="offer-add-editor-btn icon-only"
                        aria-label={tool.label}
                        title={tool.label}
                      >
                        <Icon size={15} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="offer-add-editor-toolbar offer-add-editor-toolbar-tertiary">
              <div className="offer-add-editor-selects">
                {SECONDARY_EDITOR_SELECTS.map((selectConfig) => (
                  <label
                    key={selectConfig.ariaLabel}
                    className="offer-add-editor-select-wrap"
                    aria-label={selectConfig.ariaLabel}
                  >
                    <select defaultValue={selectConfig.options[0]} aria-label={selectConfig.ariaLabel}>
                      {selectConfig.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {TERTIARY_EDITOR_TOOL_GROUPS.map((group, groupIndex) => (
                <div key={`tertiary-group-${groupIndex}`} className="offer-add-editor-toolbar-group">
                  {group.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <button
                        key={`${tool.label}-${groupIndex}`}
                        type="button"
                        className="offer-add-editor-btn icon-only"
                        aria-label={tool.label}
                        title={tool.label}
                      >
                        <Icon size={15} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="offer-add-editor-surface">
              <textarea
                placeholder="Write the long description..."
                value={formValues.longDescription}
                onChange={handleChange("longDescription")}
              />
            </div>
          </section>

          {formError && <p className="admin-markup-form-error">{formError}</p>}
          {saved && <p className="menu-form-success">Offer saved to backend.</p>}

          <div className="admin-markup-modal-actions menu-form-actions offer-add-actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
