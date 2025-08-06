import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Star,
  MessageCircle,
  Shield,
  Clock as ClockIcon,
  DollarSign,
} from "lucide-react";
import { format, addMinutes, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { useEmailVerification } from "../../hooks/useEmailVerification";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import CooldownMessage from "../../components/ui/CooldownMessage";
