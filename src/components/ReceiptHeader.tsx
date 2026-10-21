import Image from "next/image";

interface ReceiptHeaderProps {
  className?: string;
  showBorder?: boolean;
}

export default function ReceiptHeader({
  className = "",
  showBorder = true,
}: ReceiptHeaderProps) {
  return (
    <div
      className={`w-full bg-white flex items-center justify-center py-2 sm:py-3 px-3 ${
        showBorder ? "border-b border-slate-200 shadow-2xs" : ""
      } ${className}`}
    >
      <div className="w-full mx-auto flex items-center justify-center">
        <Image
          src="/images/Receipt_head.webp"
          alt="ஜெய் ஜெகந்நாத் கட்டுமானம் மற்றும் உடல் உழைப்பு தொழிலாளர்கள் நல சங்கம்"
          width={1200}
          height={200}
          preload
          sizes="100vw"
          className="h-auto w-full max-w-none object-contain mx-auto block"
        />
      </div>
    </div>
  );
}
