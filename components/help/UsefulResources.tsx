"use client";

import { useState, useMemo } from "react";
import { Search, ExternalLink, Shield, Clipboard, GraduationCap, Building2, MonitorSmartphone } from "lucide-react";
import { Input } from "@/components/ui/input";

type ResourceCategory = "regulatory" | "assessment" | "training" | "organisations" | "digital";

interface Resource {
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  domain: string;
}

const resources: Resource[] = [
  // Regulatory & Compliance
  {
    title: "CQC — Care homes guidance",
    description: "Regulations, inspection criteria, and fundamental standards for residential adult social care",
    url: "https://www.cqc.org.uk/guidance-providers/residential-adult-social-care",
    category: "regulatory",
    domain: "cqc.org.uk"
  },
  {
    title: "NICE — Care home guidelines",
    description: "Clinical and social care quality standards, falls prevention, nutrition, and end of life",
    url: "https://www.nice.org.uk/guidance/ng189",
    category: "regulatory",
    domain: "nice.org.uk"
  },
  {
    title: "Health & Social Care Act 2008",
    description: "Primary legislation governing registration and regulation of health and social care providers",
    url: "https://www.legislation.gov.uk/ukpga/2008/14/contents",
    category: "regulatory",
    domain: "legislation.gov.uk"
  },
  {
    title: "NHS England — Care policy",
    description: "NHS policies, guidance frameworks, and integration standards relevant to care home providers",
    url: "https://www.england.nhs.uk",
    category: "regulatory",
    domain: "england.nhs.uk"
  },
  // Assessment Tools
  {
    title: "Waterlow Score",
    description: "Pressure ulcer risk assessment used widely in UK care homes and NHS settings",
    url: "https://www.thecalculator.co/health/Waterlow-Score-Calculator-1116.html",
    category: "assessment",
    domain: "thecalculator.co"
  },
  {
    title: "MUST — Malnutrition screening",
    description: "BAPEN's Malnutrition Universal Screening Tool for identifying nutritional risk in residents",
    url: "https://www.bapen.org.uk/pdfs/must/must_full.pdf",
    category: "assessment",
    domain: "bapen.org.uk"
  },
  {
    title: "Barthel Index",
    description: "Measures functional independence in daily activities — mobility, continence, feeding and more",
    url: "https://www.stroke.org.uk/sites/default/files/barthel_assessment.pdf",
    category: "assessment",
    domain: "stroke.org.uk"
  },
  {
    title: "Abbey Pain Scale",
    description: "Pain assessment for people with dementia who cannot self-report",
    url: "https://www.mdcalc.com/calc/3627/abbey-pain-scale-dementia-patients",
    category: "assessment",
    domain: "mdcalc.com"
  },
  {
    title: "Cognitive Assessment Tools (MMSE/MoCA)",
    description: "MMSE, MoCA, and AMTS cognitive screening tools used for dementia and capacity assessments",
    url: "https://www.alzheimers.org.uk/sites/default/files/2018-09/cognitive_tests_factsheet.pdf",
    category: "assessment",
    domain: "alzheimers.org.uk"
  },
  {
    title: "NICE Falls Risk Assessment",
    description: "Guidance and tools for assessing and preventing falls in older people — NICE guideline CG161",
    url: "https://www.nice.org.uk/guidance/cg161",
    category: "assessment",
    domain: "nice.org.uk"
  },
  // Training & Workforce
  {
    title: "Skills for Care",
    description: "Workforce standards, training frameworks, and leadership resources for adult social care",
    url: "https://www.skillsforcare.org.uk",
    category: "training",
    domain: "skillsforcare.org.uk"
  },
  {
    title: "NHS e-Learning for Health",
    description: "Free online training modules including safeguarding, infection control, dementia, and medicines",
    url: "https://www.e-lfh.org.uk",
    category: "training",
    domain: "e-lfh.org.uk"
  },
  {
    title: "SCIE — Social Care Institute",
    description: "Practice guides, e-learning, and safeguarding resources for care home providers",
    url: "https://www.scie.org.uk/care-providers/residential-care",
    category: "training",
    domain: "scie.org.uk"
  },
  // Key Organisations
  {
    title: "Alzheimer's Society",
    description: "Clinical resources, training, and support pathways for care professionals",
    url: "https://www.alzheimers.org.uk/professionals",
    category: "organisations",
    domain: "alzheimers.org.uk"
  },
  {
    title: "Age UK",
    description: "Guidance on care home standards, resident rights, and wellbeing resources",
    url: "https://www.ageuk.org.uk/information-advice/care/care-homes/",
    category: "organisations",
    domain: "ageuk.org.uk"
  },
  {
    title: "Care Home UK",
    description: "Sector news, CQC inspection updates, and operational guidance for care home managers",
    url: "https://www.carehome.co.uk",
    category: "organisations",
    domain: "carehome.co.uk"
  },
  {
    title: "NHS — Social Care Guide",
    description: "NHS guidance on care needs assessments, funding, continuing healthcare, and local authority support",
    url: "https://www.nhs.uk/conditions/social-care-and-support-guide/",
    category: "organisations",
    domain: "nhs.uk"
  },
  // Digital Tools
  {
    title: "Digital Social Care",
    description: "NHS-backed hub for digital tools, data security guidance, and technology adoption in care",
    url: "https://www.digitalsocialcare.co.uk",
    category: "digital",
    domain: "digitalsocialcare.co.uk"
  },
  {
    title: "NHS App & Shared Care Records",
    description: "Connecting care home staff with GP records, medication information and NHS services",
    url: "https://www.nhs.uk/nhs-app/",
    category: "digital",
    domain: "nhs.uk"
  },
  {
    title: "ICO — GDPR & Data Protection",
    description: "UK data protection guidance essential for care records and personal data",
    url: "https://www.ico.org.uk/for-organisations/guide-to-data-protection/",
    category: "digital",
    domain: "ico.org.uk"
  },
];

const categoryConfig = {
  all: { label: "All", color: "gray" },
  regulatory: {
    label: "Regulatory",
    color: "blue",
    icon: Shield,
    bgColor: "bg-blue-50",
    iconBg: "bg-blue-100/80",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700"
  },
  assessment: {
    label: "Assessment Tools",
    color: "teal",
    icon: Clipboard,
    bgColor: "bg-teal-50",
    iconBg: "bg-teal-100/80",
    iconColor: "text-teal-600",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700"
  },
  training: {
    label: "Training",
    color: "purple",
    icon: GraduationCap,
    bgColor: "bg-purple-50",
    iconBg: "bg-purple-100/80",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700"
  },
  organisations: {
    label: "Organisations",
    color: "amber",
    icon: Building2,
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100/80",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700"
  },
  digital: {
    label: "Digital Tools",
    color: "orange",
    icon: MonitorSmartphone,
    bgColor: "bg-orange-50",
    iconBg: "bg-orange-100/80",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700"
  },
};

// Helper function to get border classes based on category
const getBorderClasses = (category: ResourceCategory) => {
  const borders = {
    regulatory: "border-blue-200/50 hover:border-blue-300",
    assessment: "border-teal-200/50 hover:border-teal-300",
    training: "border-purple-200/50 hover:border-purple-300",
    organisations: "border-amber-200/50 hover:border-amber-300",
    digital: "border-orange-200/50 hover:border-orange-300",
  };
  return borders[category];
};

export default function UsefulResources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ResourceCategory | "all">("all");

  // Filter resources based on search and category
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = activeFilter === "all" || resource.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  // Group filtered resources by category
  const groupedResources = useMemo(() => {
    const grouped: Record<ResourceCategory, Resource[]> = {
      regulatory: [],
      assessment: [],
      training: [],
      organisations: [],
      digital: [],
    };

    filteredResources.forEach((resource) => {
      grouped[resource.category].push(resource);
    });

    return grouped;
  }, [filteredResources]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-medium text-gray-900 mb-0.5">
          Useful Resources
        </h2>
        <p className="text-xs text-gray-600">
          Trusted links for compliance, assessments, training and sector guidance
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-sm bg-white border-gray-200 focus:border-blue-200 focus:ring-1 focus:ring-blue-100"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
            activeFilter === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>)
          .filter(key => key !== "all")
          .map((category) => {
            const config = categoryConfig[category];
            return (
              <button
                key={category}
                onClick={() => setActiveFilter(category as ResourceCategory)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeFilter === category
                    ? `${config.iconBg} ${config.iconColor}`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {config.label}
              </button>
            );
          })}
      </div>

      {/* Resources Grid by Category */}
      <div className="space-y-6">
        {filteredResources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No resources found. Try a different search or category.
            </p>
          </div>
        ) : (
          (Object.keys(groupedResources) as ResourceCategory[]).map((category) => {
            const categoryResources = groupedResources[category];
            if (categoryResources.length === 0) return null;

            const config = categoryConfig[category];
            const Icon = config.icon;

            return (
              <section key={category} className="space-y-2.5">
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                  {config.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {categoryResources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${resource.title} in new tab`}
                      className={`group block p-3 ${config.bgColor} border ${getBorderClasses(category)} rounded-lg hover:shadow-sm transition-all duration-150`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-7 h-7 ${config.iconBg} rounded-md flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">
                              {resource.title}
                            </h4>
                            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2 mb-2">
                            {resource.description}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium ${config.badgeBg} ${config.badgeText} rounded`}>
                              {config.label}
                            </span>
                            <span className="text-[10px] text-blue-600 truncate">
                              {resource.domain}
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
