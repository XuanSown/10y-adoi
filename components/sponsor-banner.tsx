"use client";

import Image from "next/image";

type SponsorGroup = {
  label: string;
  logos: { src: string; alt: string; width?: number; height?: number }[];
};

const SPONSORS: SponsorGroup[] = [
  {
    label: "Đơn vị bảo trợ truyền thông",
    logos: [
      { src: "/images/logo/fpt.png", alt: "FPT Polytechnic", width: 60, height: 70 },
      { src: "/images/logo/kinhte.png", alt: "Bộ Môn Kinh Tế", width: 60, height: 70 },
    ],
  },
  {
    label: "Đơn vị tổ chức",
    logos: [
      { src: "/images/logo/9light.png", alt: "9Lights", width: 70 },
    ],
  },
  {
    label: "Nhà tài trợ vàng",
    logos: [
      { src: "/images/logo/vang.png", alt: "Nhà tài trợ vàng", width: 60, height: 68 },
    ],
  },
  {
    label: "Nhà tài trợ bạc",
    logos: [
      { src: "/images/logo/bac.png", alt: "Nhà tài trợ bạc", width: 60, height: 68 },
    ],
  },
  {
    label: "Nhà tài trợ đồng",
    logos: [
      { src: "/images/logo/dong.png", alt: "Nhà tài trợ đồng", width: 70 },
    ],
  },
  {
    label: "Nhà tài trợ đồng hành",
    logos: [
      { src: "/images/logo/dong_hanh.png", alt: "Nhà tài trợ đồng hành", width: 70, height: 44 },
    ],
  },
];

export function SponsorBanner() {
  const leftGroups = SPONSORS.filter((_, i) => i <= 1);   // truyền thông + tổ chức
  const rightGroups = SPONSORS.filter((_, i) => i >= 2);  // tài trợ

  const renderGroup = (group: SponsorGroup, gi: number) => (
    <div key={gi} className="sponsor-group">
      <span className="sponsor-label">{group.label}</span>
      <div className="sponsor-logos">
        {group.logos.map((logo, li) => (
          <Image
            key={li}
            src={logo.src}
            alt={logo.alt}
            width={logo.width ?? 60}
            height={logo.height ?? 56}
            className="sponsor-logo-img"
            style={logo.height ? { height: logo.height } : undefined}
            unoptimized
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="sponsor-banner">
      <div className="sponsor-banner-inner">
        <div className="sponsor-side sponsor-left">
          {leftGroups.map(renderGroup)}
        </div>
        <div className="sponsor-side sponsor-right">
          {rightGroups.map((g, i) => renderGroup(g, i + 2))}
        </div>
      </div>
    </div>
  );
}
