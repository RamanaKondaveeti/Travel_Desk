import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Bus,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import heroImage from "../../assets/images/hero-bus.png";
import { POPULAR_RTC_OPERATORS } from "../../data/popularBuses";
import SiteFooter from "../../components/layout/SiteFooter";
import "../../STYLES/HomePage.css";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { getPublicFeaturedOffers, getActiveOffers } from "../../services/adminFeaturedOffersService";
import { getPopularBusRoutesFromSearchHistory } from "../../services/busSearchHistoryService";
import { toApiUrl } from "../../services/apiClient";
import { usePromo } from "../../contexts/PromoContext";

const USE_DIRECT_API_IN_DEV =
  String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() ===
  "true";
const IS_LOCAL_DEV =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const PLACES_API_URL =
  IS_LOCAL_DEV && !USE_DIRECT_API_IN_DEV
    ? "/api/Places"
    : process.env.REACT_APP_PLACES_API_URL || "/api/Places";
const FEATURED_OFFER_ASSET_PATHS = [
  "uploads",
  "upload",
  "images",
  "image",
  "files",
  "media",
  "assets",
  "offers",
];

const BUS_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Two Way" },
];

const FALLBACK_CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Mumbai",
  "Pune",
  "Vijayawada",
  "Visakhapatnam",
  "Delhi",
  "Kolkata",
  "Ahmedabad",
  "Proddatur",  
];

const REVIEWS = [
  {
    id: "review-1",
    type: "Bus Booking",
    comment: "Two-way booking flow is smooth and payment confirmation is instant.",
    author: "Rohit M.",
    rating: "4.9/5",
  },
  {
    id: "review-2",
    type: "Bus Booking",
    comment: "Seat layout and boarding point details are clear and accurate.",
    author: "Priya S.",
    rating: "4.8/5",
  },
  {
    id: "review-3",
    type: "Bus Booking",
    comment: "Route search is quick and boarding details are easy to follow.",
    author: "Karthik R.",
    rating: "4.7/5",
  },
  {
    id: "review-4",
    type: "Bus Booking",
    comment: "Round trip option helped me plan both routes in one screen.",
    author: "Sneha P.",
    rating: "4.8/5",
  },
  {
    id: "review-5",
    type: "Bus Booking",
    comment: "Date selector opens instantly and return date handling is perfect.",
    author: "Amit K.",
    rating: "4.9/5",
  },
  {
    id: "review-6",
    type: "Bus Booking",
    comment: "Price filters and route details make intercity planning easy.",
    author: "Neha T.",
    rating: "4.6/5",
  },
];

const HIGHLIGHTS = [
  {
    id: "highlight-1",
    title: "Why Choose Us?",
    text: "From search to seat selection, we keep bus bookings simple, pricing transparent, and support available whenever you need help.",
  },
  {
    id: "highlight-2",
    title: "We Believe in the Magic of Travel",
    text: "Every journey should feel smooth and personal. Our platform focuses on fast search, trusted inventory, and confirmation workflows that reduce stress.",
  },
  {
    id: "highlight-3",
    title: "Your Perfect Travel Experience Starts Here",
    text: "Compare options, book quickly, and manage plans in one place. We are built for quick intercity bus bookings.",
  },
];

const HERO_METRICS = [
  { id: "metric-1", value: "3,200+", label: "Verified Routes" },
  { id: "metric-2", value: "180+", label: "Cities Connected" },
  { id: "metric-3", value: "24/7", label: "Travel Assistance" },
  { id: "metric-4", value: "98.7%", label: "On-Time Confirmations" },
  { id: "metric-5", value: "1.2M+", label: "Tickets Booked" },
];

const HERO_TAGS = [
  { id: "tag-1", label: "Live fares" },
  { id: "tag-2", label: "Instant booking confirmation" },
  { id: "tag-3", label: "Flexible trip combinations" },
];

function getDateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getStaticAiReply(message) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("hi") ||
    normalized.includes("hello") ||
    normalized.includes("hey")
  ) {
    return "Hello. I can help with bus routes, fares, seats, and booking flow questions.";
  }

  if (
    normalized.includes("bus") ||
    normalized.includes("rtc") ||
    normalized.includes("seat")
  ) {
    return "For buses, tell me your route and travel date. I can guide you to seat selection and payment steps.";
  }

  if (
    normalized.includes("price") ||
    normalized.includes("fare") ||
    normalized.includes("cost") ||
    normalized.includes("offer")
  ) {
    return "You can compare fares from the search results page and use active offers shown in the Featured Offers section.";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("refund") ||
    normalized.includes("reschedule")
  ) {
    return "For cancellation or refunds, go to your bookings section and choose the specific trip to view refund details.";
  }

  return "This is a static AI demo reply. Once your API is connected, I will respond with dynamic answers.";
}

function getInitialAiChatMessages() {
  return [
    {
      id: `ai-welcome-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: "assistant",
      text: "Hi, I am Travel AI. Ask me anything about bus bookings.",
    },
  ];
}

function getFeaturedOffersPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload?.$values)) {
    return payload.$values;
  }

  if (Array.isArray(payload?.offers)) {
    return payload.offers;
  }

  if (Array.isArray(payload?.Offers)) {
    return payload.Offers;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.Data)) {
    return payload.Data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.Items)) {
    return payload.Items;
  }

  if (Array.isArray(payload?.value)) {
    return payload.value;
  }

  if (Array.isArray(payload?.Value)) {
    return payload.Value;
  }

  const nestedPayloads = [
    payload?.result,
    payload?.Result,
    payload?.results,
    payload?.Results,
    payload?.payload,
    payload?.Payload,
    payload?.response,
    payload?.Response,
    payload?.data?.$values,
    payload?.Data?.$values,
    payload?.data?.items,
    payload?.Data?.Items,
    payload?.data?.offers,
    payload?.Data?.Offers,
  ];

  for (const nestedPayload of nestedPayloads) {
    const nestedOffers = getFeaturedOffersPayload(nestedPayload);
    if (nestedOffers.length > 0) {
      return nestedOffers;
    }
  }

  return [];
}

function normalizeBookingType(value) {
  return String(value || "").trim().toLowerCase();
}

function pickOfferValue(source, keys, fallback = "") {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }

  return fallback;
}

function normalizeOfferActiveFlag(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "no", "inactive", "disabled", "expired"].includes(normalized);
}

function cleanFeaturedOfferImageUrl(value) {
  let text = String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/%22/gi, "")
    .replace(/\\/g, "/")
    .replace(/^~\//, "/");

  if (!text) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(text)) {
    return text;
  }

  text = text
    .replace(/^.*\/wwwroot\//i, "/")
    .replace(/^\/?wwwroot\//i, "/")
    .replace(/^\/?public\//i, "/");

  if (
    new RegExp(`^(${FEATURED_OFFER_ASSET_PATHS.join("|")})/`, "i").test(text)
  ) {
    return `/${text}`;
  }

  return text;
}

function isNgrokHostname(hostname) {
  const normalizedHostname = String(hostname || "").toLowerCase();
  return (
    normalizedHostname.includes("ngrok-free.dev") ||
    normalizedHostname.includes("ngrok.io")
  );
}

function shouldProxyFeaturedOfferImagePath(pathname) {
  const normalizedPath = String(pathname || "").replace(/^\/+/, "");
  return FEATURED_OFFER_ASSET_PATHS.some((prefix) =>
    normalizedPath.toLowerCase().startsWith(`${prefix.toLowerCase()}/`),
  );
}

function resolveFeaturedOfferImageSrc(imageUrl) {
  const cleanUrl = cleanFeaturedOfferImageUrl(imageUrl);

  if (!cleanUrl) {
    return "";
  }

  if (/^(data:|blob:)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  if (IS_LOCAL_DEV) {
    try {
      const parsedUrl = new URL(cleanUrl, window.location.origin);

      if (
        isNgrokHostname(parsedUrl.hostname) &&
        shouldProxyFeaturedOfferImagePath(parsedUrl.pathname)
      ) {
        return `${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch {
      // Fall back to the normal API URL resolution below.
    }
  }

  return toApiUrl(cleanUrl);
}

function normalizeFeaturedOffer(offer, index) {
  const id =
    pickOfferValue(offer, ["id", "Id", "offerId", "OfferId", "offerCode", "OfferCode"]) ||
    `offer-${index}`;
  const bookingType = pickOfferValue(offer, ["bookingType", "BookingType"]);
  const isActive =
    offer?.isCouponActive ??
    offer?.IsCouponActive ??
    offer?.isActive ??
    offer?.IsActive ??
    true;
  const imageUrl = pickOfferValue(offer, [
    "imageUrl",
    "ImageUrl",
    "imageURL",
    "ImageURL",
    "image",
    "Image",
    "imagePath",
    "ImagePath",
    "offerImageUrl",
    "OfferImageUrl",
    "bannerImageUrl",
    "BannerImageUrl",
    "thumbnailUrl",
    "ThumbnailUrl",
  ]);

  return {
    id,
    offerCode: pickOfferValue(offer, ["offerCode", "OfferCode", "offerId", "OfferId"]),
    title: pickOfferValue(offer, ["title", "Title", "name", "Name"], "Travel Offer"),
    subtitle: pickOfferValue(offer, ["subtitle", "Subtitle"]),
    description: pickOfferValue(offer, ["description", "Description", "subtitle", "Subtitle"]),
    couponCode: pickOfferValue(offer, ["couponCode", "CouponCode", "code", "Code"]),
    imageUrl: cleanFeaturedOfferImageUrl(imageUrl),
    bookingType,
    isActive: normalizeOfferActiveFlag(isActive),
    couponExpiresAtUtc: pickOfferValue(offer, ["couponExpiresAtUtc", "CouponExpiresAtUtc"]),
  };
}

function AutoMarquee({ items, className, duration, renderItem }) {
  const loopItems = [...items, ...items];

  return (
    <div className={`marquee ${className}`}>
      <div
        className="marquee-track"
        style={{ "--marquee-duration": `${duration}s` }}
      >
        {loopItems.map((item, index) => (
          <div className="marquee-slide" key={`${item.id}-${index}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedOfferImage({ offer }) {
  const [failed, setFailed] = useState(false);
  const hasImage = offer.imageUrl && !failed;

  useEffect(() => {
    setFailed(false);
  }, [offer.imageUrl]);

  if (!hasImage) {
    return (
      <div className="offer-image-placeholder">
        <span>{offer.bookingType || "Offer"}</span>
      </div>
    );
  }

  return (
    <img
      src={resolveFeaturedOfferImageSrc(offer.imageUrl)}
      alt={offer.title}
      onError={() => setFailed(true)}
    />
  );
}

function PlaceAutocomplete({
  label,
  value,
  onChange,
  tripType,
  field,
  placeholder,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const requestAbortRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = inputValue.trim();

    if (!open || query.length === 0) {
      setResults([]);
      setLoading(false);

      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }

      return;
    }

    const controller = new AbortController();

    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
    }

    requestAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const endpoint = new URL(PLACES_API_URL, window.location.origin);
        endpoint.searchParams.set("query", query);
        endpoint.searchParams.set("tripType", tripType);
        endpoint.searchParams.set("field", field);
        endpoint.searchParams.set("limit", "20");

        const needsNgrokBypass =
          endpoint.hostname.includes("ngrok-free.dev") ||
          endpoint.hostname.includes("ngrok.io");

        const response = await fetch(endpoint.toString(), {
          signal: controller.signal,
          headers: needsNgrokBypass
            ? { "ngrok-skip-browser-warning": "true" }
            : undefined,
        });

        if (!response.ok) {
          throw new Error(`Place API failed with status ${response.status}`);
        }

        const payload = await response.json();

        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.value)
            ? payload.value
            : [];

        const normalized = rawList
          .map((item) => ({
            cityName: typeof item === "string" ? item : item?.cityName || "",
            usageCount:
              typeof item === "object" && item?.usageCount
                ? item.usageCount
                : 0,
          }))
          .filter((item) => item.cityName);

        setResults(normalized);
      } catch (error) {
        if (error.name !== "AbortError") {
          const normalizedQuery = query.toLowerCase();
          const fallbackMatches = FALLBACK_CITIES.filter((city) =>
            city.toLowerCase().includes(normalizedQuery),
          ).map((cityName, index) => ({
            cityName,
            usageCount: 100 - index,
          }));

          setResults(fallbackMatches);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, open, tripType, field]);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange(nextValue);
    setOpen(nextValue.trim().length > 0);
  };

  const handleSelect = (cityName) => {
    setInputValue(cityName);
    onChange(cityName);
    setOpen(false);
  };

  return (
    <div className="field place-autocomplete" ref={wrapperRef}>
      <label>{label}</label>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(inputValue.trim().length > 0)}
        className="field-control place-input"
        placeholder={placeholder}
        autoComplete="off"
      />

      {open && (
        <div className="place-dropdown">
          {loading ? (
            <div className="place-meta">Searching places...</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={`${item.cityName}-${item.usageCount}`}
                type="button"
                className="place-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(item.cityName)}
              >
                {item.cityName}
              </button>
            ))
          ) : (
            <div className="place-meta">No matching places found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedOffer, setSelectedOffer } = usePromo();
  const aiChatMessagesRef = useRef(null);
  const aiReplyTimerRef = useRef(null);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState(
    getInitialAiChatMessages,
  );

  const [busTripType, setBusTripType] = useState("oneway");
  const [busFrom, setBusFrom] = useState("");
  const [busTo, setBusTo] = useState("");
  const [busDepartureDate, setBusDepartureDate] = useState(() =>
    getDateInputValue(0),
  );
  const [busReturnDate, setBusReturnDate] = useState(() =>
    getDateInputValue(1),
  );
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [featuredOffersLoading, setFeaturedOffersLoading] = useState(false);
  const [featuredOffersError, setFeaturedOffersError] = useState("");
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [popularRoutesLoading, setPopularRoutesLoading] = useState(false);
  const [popularRoutesError, setPopularRoutesError] = useState("");
  const [isDealsDialogOpen, setIsDealsDialogOpen] = useState(false);

  useEffect(() => {
    if (!isDealsDialogOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDealsDialogOpen]);

  const dealsDialog =
    isDealsDialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="deals-dialog-backdrop"
            role="presentation"
            onClick={() => setIsDealsDialogOpen(false)}
          >
            <section
              className="deals-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deals-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="deals-dialog-header">
                <div>
                  <span className="section-kicker">This Week</span>
                  <h2 id="deals-dialog-title">All Featured Deals</h2>
                </div>
                <button
                  type="button"
                  className="deals-dialog-close"
                  onClick={() => setIsDealsDialogOpen(false)}
                  aria-label="Close deals"
                >
                  <X size={18} />
                  <span>Close</span>
                </button>
              </header>
              <div className="deals-dialog-grid">
                {featuredOffers.map((offer) => (
                  <article className="offer-card deals-dialog-card" key={offer.id}>
                    <FeaturedOfferImage offer={offer} />
                    <div className="offer-content">
                      <h3>{offer.title}</h3>
                      <p>{offer.description || offer.subtitle}</p>
                      {offer.couponCode ? (
                        <span className="offer-code">Code: {offer.couponCode}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleOfferBooking(offer)}
                      >
                        Book now
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  useEffect(() => {
    if (!isAiChatOpen || !aiChatMessagesRef.current) {
      return;
    }

    aiChatMessagesRef.current.scrollTop =
      aiChatMessagesRef.current.scrollHeight;
  }, [isAiChatOpen, aiChatMessages, isAiTyping]);

  useEffect(
    () => () => {
      if (aiReplyTimerRef.current) {
        clearTimeout(aiReplyTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedOffers = async () => {
      setFeaturedOffersLoading(true);
      setFeaturedOffersError("");

      try {
        const response = await getActiveOffers("Bus");
        const activeOffers = getFeaturedOffersPayload(response)
          .map(normalizeFeaturedOffer)
          .filter((offer) => offer.isActive);

        if (isMounted) {
          setFeaturedOffers(activeOffers);
        }
      } catch (error) {
        if (isMounted) {
          setFeaturedOffersError("Unable to load featured offers.");
        }
      } finally {
        if (isMounted) {
          setFeaturedOffersLoading(false);
        }
      }
    };

    loadFeaturedOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPopularRoutes = async () => {
      setPopularRoutesLoading(true);
      setPopularRoutesError("");

      try {
        const routes = await getPopularBusRoutesFromSearchHistory({ limit: 12 });

        if (isMounted) {
          setPopularRoutes(routes);
        }
      } catch (error) {
        if (isMounted) {
          setPopularRoutesError("Unable to load popular routes.");
        }
      } finally {
        if (isMounted) {
          setPopularRoutesLoading(false);
        }
      }
    };

    loadPopularRoutes();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSwapBuses = () => {
    setBusFrom(busTo);
    setBusTo(busFrom);
  };

  const openPopularBusRoutes = (operatorId) => {
    navigate(`/popular-buses/${operatorId}`);
  };

  const isBusTwoWay = busTripType === "twoway";

  const navigateToBusSearch = (busPayload) => {
    const busParams = new URLSearchParams();

    Object.entries(busPayload).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        busParams.set(key, value.trim());
      }
    });

    navigate(
      `/search/buses${busParams.toString() ? `?${busParams.toString()}` : ""}`,
      { state: busPayload },
    );
  };

  const handleOfferBooking = (offer) => {
    setIsDealsDialogOpen(false);
    setSelectedOffer(offer);
    const bookingType = normalizeBookingType(offer?.bookingType);

    navigateToBusSearch({
      source: bookingType === "bus" ? "Hyderabad" : "",
      destination: bookingType === "bus" ? "Vijayawada" : "",
      tripType: "oneway",
      departureDate: getDateInputValue(0),
    });
  };

  const handlePopularRouteBooking = (route) => {
    navigateToBusSearch({
      source: route.fromCity,
      destination: route.toCity,
      tripType: "oneway",
      departureDate: getDateInputValue(0),
    });
  };

  const handleSearch = () => {
    const busPayload = {
      source: busFrom.trim(),
      destination: busTo.trim(),
      tripType: busTripType,
      departureDate: busDepartureDate.trim(),
      returnDate: busTripType === "twoway" ? busReturnDate.trim() : "",
    };
    navigateToBusSearch(busPayload);
  };

  const handleAiChatSubmit = (event) => {
    event.preventDefault();

    const trimmedInput = aiChatInput.trim();
    if (!trimmedInput) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedInput,
    };

    setAiChatMessages((previous) => [...previous, userMessage]);
    setAiChatInput("");
    setIsAiTyping(true);

    if (aiReplyTimerRef.current) {
      clearTimeout(aiReplyTimerRef.current);
    }

    aiReplyTimerRef.current = setTimeout(() => {
      const assistantReply = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: getStaticAiReply(trimmedInput),
      };

      setAiChatMessages((previous) => [...previous, assistantReply]);
      setIsAiTyping(false);
      aiReplyTimerRef.current = null;
    }, 460);
  };

  const handleAiChatReset = () => {
    if (aiReplyTimerRef.current) {
      clearTimeout(aiReplyTimerRef.current);
      aiReplyTimerRef.current = null;
    }

    setIsAiTyping(false);
    setAiChatInput("");
    setAiChatMessages(getInitialAiChatMessages());
  };

  const canResetAiChat =
    isAiTyping || aiChatInput.trim().length > 0 || aiChatMessages.length > 1;

  return (
    <div className="homepage">
      <style>{`
        /* Custom Popular Route Card Embedded Styles */
        .pop-route-card {
           box-sizing: border-box;
           background: #ffffff;
           border: 1px solid rgba(225, 230, 235, 0.9);
           border-radius: 16px;
           padding: 16px;
           width: 280px;
           display: flex;
           flex-direction: column;
           box-shadow: 0 4px 12px rgba(6, 24, 44, 0.04);
           transition: transform 0.2s, box-shadow 0.2s;
           text-align: left;
        }

        .pop-route-card:hover {
           transform: translateY(-2px);
           box-shadow: 0 6px 18px rgba(6, 24, 44, 0.08);
        }

        .pop-route-top-row {
           display: flex;
           justify-content: space-between;
           align-items: center;
           width: 100%;
        }

        .pop-route-tag-search {
           background: #e14e2a;
           color: #ffffff;
           padding: 3px 10px;
           border-radius: 999px;
           font-size: 0.65rem;
           font-weight: 800;
           letter-spacing: 0.04em;
        }

        .pop-route-tag-searches {
           background: #fdf2e9;
           color: #b73e21;
           border: 1px solid #f9dbce;
           padding: 2px 8px;
           border-radius: 999px;
           font-size: 0.65rem;
           font-weight: 700;
        }

        .pop-route-cities-row {
           display: flex;
           align-items: center;
           justify-content: space-between;
           margin-top: 16px;
           width: 100%;
           gap: 8px;
        }

        .pop-route-city {
           font-size: 1.05rem;
           font-weight: 700;
           color: #1e2c3a;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           flex: 1;
        }

        .pop-route-city.from {
           text-align: left;
           text-transform: capitalize;
        }

        .pop-route-city.to {
           text-align: right;
           text-transform: capitalize;
        }

        .pop-route-icon-circle {
           width: 28px;
           height: 28px;
           min-width: 28px;
           min-height: 28px;
           border-radius: 50%;
           border: 1px solid #f9dbce;
           background: #fdf2e9;
           display: flex;
           align-items: center;
           justify-content: center;
           color: #e14e2a;
           margin: 0 4px;
        }

        .pop-route-trending {
           color: #7a8c9e;
           font-size: 0.72rem;
           margin-top: 10px;
           font-weight: 500;
        }

        .pop-route-meta-row {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-top: 16px;
           width: 100%;
           border-top: 1px dashed rgba(225, 230, 235, 0.8);
           padding-top: 12px;
        }

        .pop-route-meta-left {
           color: #e14e2a;
           font-size: 0.68rem;
           font-weight: 700;
           letter-spacing: 0.02em;
        }

        .pop-route-meta-right {
           color: #24506f;
           font-size: 0.68rem;
           font-weight: 700;
           letter-spacing: 0.02em;
        }

        .pop-route-book-btn {
           background: #e14e2a;
           color: #ffffff;
           font-weight: 700;
           font-size: 0.8rem;
           letter-spacing: 0.06em;
           border: none;
           border-radius: 8px;
           width: 100%;
           padding: 10px 0;
           cursor: pointer;
           text-align: center;
           margin-top: 14px;
           transition: background 0.2s, transform 0.1s;
        }

        .pop-route-book-btn:hover {
           background: #b73e21;
        }

        .pop-route-book-btn:active {
           transform: scale(0.98);
        }

         .popular-routes-marquee .marquee-slide {
            padding: 12px 10px;
         }

         /* Custom Offers Scrollable Row and Selected Highlighting */
         .offers-scroll-row {
           display: flex;
           gap: 24px;
           overflow-x: auto;
           padding: 12px 4px 20px;
           scroll-behavior: smooth;
         }
         .offers-scroll-row::-webkit-scrollbar {
           height: 8px;
         }
         .offers-scroll-row::-webkit-scrollbar-track {
           background: rgba(0, 0, 0, 0.03);
           border-radius: 10px;
         }
         .offers-scroll-row::-webkit-scrollbar-thumb {
           background: rgba(0, 0, 0, 0.1);
           border-radius: 10px;
         }
         .offers-scroll-row::-webkit-scrollbar-thumb:hover {
           background: rgba(0, 0, 0, 0.2);
         }
         .offer-card {
           position: relative;
           min-width: 320px;
           max-width: 320px;
           flex-shrink: 0;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
         }
         .offer-card-selected {
           border: 2px solid #10b981 !important;
           box-shadow: 0 12px 24px rgba(16, 185, 129, 0.15) !important;
           transform: translateY(-2px);
         }
         .offer-badge-applied {
           position: absolute;
           top: 12px;
           right: 12px;
           background: #10b981;
           color: #ffffff;
           font-size: 0.75rem;
           font-weight: 700;
           padding: 4px 10px;
           border-radius: 999px;
           box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
           z-index: 10;
         }
         /* Skeleton loaders style */
         .offer-skeleton-card {
           min-width: 320px;
           height: 380px;
           background: #ffffff;
           border: 1px solid rgba(225, 230, 235, 0.9);
           border-radius: 16px;
           padding: 16px;
           display: flex;
           flex-direction: column;
           gap: 12px;
           box-shadow: 0 4px 12px rgba(6, 24, 44, 0.04);
         }
         .skeleton-image {
           height: 160px;
           background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 12px;
         }
         .skeleton-title {
           height: 24px;
           width: 70%;
           background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         .skeleton-desc {
           height: 16px;
           width: 90%;
           background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         .skeleton-button {
           height: 40px;
           width: 100%;
           background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 8px;
           margin-top: auto;
         }
         @keyframes skeleton-loading {
           0% {
             background-position: 100% 50%;
           }
           100% {
             background-position: 0% 50%;
           }
         }
      `}</style>
      <section className="hero-section">
        <img src={heroImage} alt="" className="hero-bg-image" aria-hidden="true" />
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-grid">
            <div className="hero-copy-block">
              <span className="hero-kicker">Smart Travel Studio</span>
              <h1>Book bolder journeys with one unified travel desk.</h1>
              <p>
                Compare bus options, choose one-way or return routes, and
                confirm tickets in seconds with transparent pricing.
              </p>

              <div className="hero-metric-grid">
                {HERO_METRICS.map((metric) => (
                  <article key={metric.id} className="hero-metric-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>

              <div className="hero-tag-row">
                {HERO_TAGS.map((tag) => (
                  <span key={tag.id} className="hero-tag">
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="search-panel">
              <div className="tabs-wrap">
                <div className="tabs" role="tablist" aria-label="Booking type">
                  <button type="button" className="tab active">
                    <Bus size={17} />
                    <span>Buses</span>
                  </button>
                </div>
              </div>

              <div className="booking-content">
                  <div
                    className="trip-switch"
                    role="tablist"
                    aria-label="Bus trip type"
                  >
                    {BUS_TRIP_TYPES.map((tripType) => (
                      <button
                        key={tripType.value}
                        type="button"
                        className={`trip-chip ${
                          busTripType === tripType.value ? "active" : ""
                        }`}
                        onClick={() => setBusTripType(tripType.value)}
                      >
                        {tripType.label}
                      </button>
                    ))}
                  </div>

                  <div className="search-grid bus-standard-grid">
                    <PlaceAutocomplete
                      label="Source"
                      value={busFrom}
                      onChange={setBusFrom}
                      tripType="bus"
                      field="from"
                      placeholder="Type source city"
                    />

                    <div className="swap-field">
                      <button
                        type="button"
                        className="swap-btn"
                        onClick={handleSwapBuses}
                        aria-label="Swap bus origin and destination"
                      >
                        <ArrowLeftRight size={16} />
                      </button>
                    </div>

                    <PlaceAutocomplete
                      label="Destination"
                      value={busTo}
                      onChange={setBusTo}
                      tripType="bus"
                      field="to"
                      placeholder="Type destination city"
                    />

                 <div className="field field-with-icon" style={{ position: "relative" }}>
  <label>Departure</label>
  <input
    type="text"
    readOnly
    value={toDisplayDate(busDepartureDate)}
    placeholder="DD-MM-YYYY"
    className="field-control"
    style={{ cursor: "pointer" }}
    onClick={() => document.getElementById("bus-dep-date").showPicker?.()}
  />
  <input
    id="bus-dep-date"
    type="date"
    value={busDepartureDate}
    onChange={(event) => setBusDepartureDate(event.target.value)}
    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
  />
</div>

                    <div className="field field-with-icon">
                      <label>Return</label>
                     {isBusTwoWay ? (
  <div style={{ position: "relative" }}>
    <input
      type="text"
      readOnly
      value={toDisplayDate(busReturnDate)}
      placeholder="DD-MM-YYYY"
      className="field-control"
      style={{ cursor: "pointer" }}
      onClick={() => document.getElementById("bus-ret-date").showPicker?.()}
    />
    <input
      id="bus-ret-date"
      type="date"
      value={busReturnDate}
      onChange={(event) => setBusReturnDate(event.target.value)}
      style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
    />
  </div>
                      ) : (
                        <input
                          type="text"
                          className="field-control watermark-field"
                          value=""
                          placeholder="Return date available for Two Way"
                          disabled
                        />
                      )}
                    </div>
                  </div>
                </div>

              <button
                type="button"
                className="search-btn"
                onClick={handleSearch}
              >
                <Search size={16} />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="offers-section section-shell">
        <div className="section-header offers-header">
          <div>
            <span className="section-kicker">This Week</span>
            <h2>Featured Offers</h2>
          </div>
          <button
            type="button"
            className="section-link"
            onClick={() => setIsDealsDialogOpen(true)}
            disabled={featuredOffers.length === 0}
          >
            View all deals
          </button>
        </div>
        {featuredOffersLoading ? (
          <div className="offers-scroll-row">
            {[1, 2, 3].map((n) => (
              <div key={n} className="offer-skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-title"></div>
                <div className="skeleton-desc"></div>
                <div className="skeleton-button"></div>
              </div>
            ))}
          </div>
        ) : featuredOffersError ? (
          <div className="offers-error">{featuredOffersError}</div>
        ) : featuredOffers.length === 0 ? (
          <div className="offers-empty">No featured offers available.</div>
        ) : (
          <div className="offers-scroll-row">
            {featuredOffers.map((offer) => {
              const isSelected = selectedOffer && selectedOffer.offerCode === offer.offerCode;
              return (
                <article
                  className={`offer-card ${isSelected ? "offer-card-selected" : ""}`}
                  key={offer.id}
                >
                  {isSelected && (
                    <span className="offer-badge-applied">
                      Applied ✓
                    </span>
                  )}
                  <FeaturedOfferImage offer={offer} />
                  <div className="offer-content">
                    <h3>{offer.title}</h3>
                    <p>{offer.description || offer.subtitle}</p>
                    {offer.couponCode ? (
                      <span className="offer-code">Code: {offer.couponCode}</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleOfferBooking(offer)}
                    >
                      {isSelected ? "Applied" : "Book now"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="popular-routes-section section-shell">
        <div className="section-header">
          <div>
            <span className="section-kicker">POPULAR BUS ROUTES</span>
            <h2>Most Booked Bus Routes</h2>
          </div>
        </div>

        {popularRoutesLoading ? (
          <div className="popular-routes-loading">Loading popular routes...</div>
        ) : popularRoutesError ? (
          <div className="popular-routes-error">{popularRoutesError}</div>
        ) : popularRoutes.length === 0 ? (
          <div className="popular-routes-empty">No popular routes available.</div>
        ) : (
          <AutoMarquee
            items={popularRoutes}
            className="popular-routes-marquee"
            duration={36}
            renderItem={(route) => (
              <article className="pop-route-card" key={route.id}>
                <div className="pop-route-top-row">
                  <span className="pop-route-tag-search">SEARCH</span>
                  <span className="pop-route-tag-searches">{route.searches.toLocaleString()} SEARCHES</span>
                </div>
                
                <div className="pop-route-cities-row">
                  <span className="pop-route-city from" title={route.fromCity}>
                    {route.fromCity}
                  </span>
                  <div className="pop-route-icon-circle">
                    <Bus size={13} />
                  </div>
                  <span className="pop-route-city to" title={route.toCity}>
                    {route.toCity}
                  </span>
                </div>

                <div className="pop-route-trending">
                  Trending from bus search history
                </div>

                <div className="pop-route-meta-row">
                  <span className="pop-route-meta-left">Recently searched</span>
                  <span className="pop-route-meta-right">Backend data</span>
                </div>

                <button
                  type="button"
                  className="pop-route-book-btn"
                  onClick={() => handlePopularRouteBooking(route)}
                >
                  BOOK BUS
                </button>
              </article>
            )}
          />
        )}
      </section>

      {dealsDialog}

      <section
        className="popular-buses-section section-shell"
        id="popular-buses"
      >
        <div className="section-header">
          <div>
            <span className="section-kicker">Popular Buses</span>
            <h2>RTC Bus Corporations</h2>
          </div>
        </div>

        <div className="rtc-carousel-wrap">
          <AutoMarquee
            items={POPULAR_RTC_OPERATORS}
            className="rtc-marquee"
            duration={34}
            renderItem={(operator) => (
              <article
                key={operator.id}
                className="rtc-card"
                style={{ backgroundImage: `url(${operator.background})` }}
              >
                <div className="rtc-card-overlay" />
                <div className="rtc-card-logo">
                  <img src={operator.logo} alt={`${operator.shortName} logo`} />
                </div>
                <div className="rtc-card-content">
                  <h3>{operator.shortName}</h3>
                  <p>{operator.name}</p>
                  <button
                    type="button"
                    onClick={() => openPopularBusRoutes(operator.id)}
                  >
                    Book Now
                  </button>
                </div>
              </article>
            )}
          />
        </div>
      </section>

      <section className="reviews-section section-shell">
        <div className="section-header">
          <div>
            <span className="section-kicker">Customer Voices</span>
            <h2>What Travelers Say</h2>
          </div>
        </div>

        <AutoMarquee
          items={REVIEWS}
          className="review-marquee"
          duration={36}
          renderItem={(review) => (
            <article className="review-slide">
              <div className="review-slide-top">
                <MessageSquareText size={14} />
                <span className="review-type">{review.type}</span>
              </div>
              <p>{review.comment}</p>
              <div className="review-slide-footer">
                <strong>{review.author}</strong>
                <span>{review.rating}</span>
              </div>
            </article>
          )}
        />
      </section>

      <section className="signup-section section-shell">
        <div className="signup-card">
          <div className="signup-copy">
            <h2>Sign Up For Exclusive Offers</h2>
            <p>Exclusive access to coupons, special offers and promotions.</p>
          </div>

          <form
            className="signup-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <input type="email" placeholder="Enter your email address" />
            <input type="tel" placeholder="Enter your mobile no." />
            <button type="submit">SUBMIT</button>
          </form>
        </div>
      </section>

      <section className="insights-section section-shell">
        <div className="section-header">
          <div>
            <span className="section-kicker">Travel Insights</span>
            <h2>Plan Better Every Time</h2>
          </div>
        </div>
        <div className="insights-grid">
          {HIGHLIGHTS.map((item) => (
            <article key={item.id} className="insight-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={`home-ai-chat ${isAiChatOpen ? "open" : "closed"}`}>
        <button
          type="button"
          className="home-ai-toggle"
          aria-expanded={isAiChatOpen}
          aria-controls="home-ai-chat-panel"
          aria-label={isAiChatOpen ? "Close AI chat" : "Open AI chat"}
          onClick={() => setIsAiChatOpen((previous) => !previous)}
        >
          <span className="home-ai-toggle-line" aria-hidden="true" />
          {isAiChatOpen ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </button>

        {isAiChatOpen && (
          <aside
            className="home-ai-chat-panel"
            id="home-ai-chat-panel"
            aria-label="Travel AI Assistant"
          >
            <div className="home-ai-cameo" aria-hidden="true">
              <span className="home-ai-cameo-halo" />
              <span className="home-ai-cameo-orbit home-ai-cameo-orbit-a" />
              <span className="home-ai-cameo-orbit home-ai-cameo-orbit-b" />
              <span className="home-ai-cameo-core">AI</span>
            </div>

            <div className="home-ai-chat-head">
              <div className="home-ai-chat-head-copy">
                <strong>AI Concierge</strong>
                <span className="home-ai-chat-status">
                  Static assistant preview
                </span>
              </div>
              <button
                type="button"
                className="home-ai-reset-btn"
                onClick={handleAiChatReset}
                disabled={!canResetAiChat}
              >
                Reset
              </button>
            </div>

            <div className="home-ai-chat-messages" ref={aiChatMessagesRef}>
              {aiChatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`home-ai-chat-message ${
                    message.role === "user" ? "user" : "assistant"
                  }`}
                >
                  {message.text}
                </div>
              ))}

              {isAiTyping && (
                <div className="home-ai-chat-message assistant typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <form className="home-ai-chat-form" onSubmit={handleAiChatSubmit}>
              <input
                type="text"
                value={aiChatInput}
                onChange={(event) => setAiChatInput(event.target.value)}
                placeholder="Ask Travel AI..."
                maxLength={220}
              />
              <button type="submit">Send</button>
            </form>
          </aside>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
