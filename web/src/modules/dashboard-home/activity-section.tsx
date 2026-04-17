import { FileText } from "lucide-react";

const subtests = [
  { name: "Penalaran Umum", skor: "800/1000", status: "selesai" },
  { name: "Pengetahuan dan Pemahaman Umum", skor: "800/1000", status: "selesai" },
  { name: "Penalaran Umum", skor: "-", status: "belum" },
  { name: "Penalaran Umum", skor: "-", status: "kerjakan-terakhir" },
  { name: "Penalaran Umum", skor: "-", status: "kerjakan-terakhir" },
  { name: "Penalaran Umum", skor: "-", status: "kerjakan-terakhir" },
  { name: "Penalaran Umum", skor: "-", status: "kerjakan-terakhir" },
];

function StatusBadge({ status }: { status: string }) {
  const base = "inline-flex items-center justify-center px-[14px] py-[9px] rounded-xl border border-neutral-300 text-sm whitespace-nowrap";
  if (status === "selesai")
    return <span className={`${base} bg-[rgba(132,235,180,0.5)]`}>Selesai</span>;
  if (status === "belum")
    return <span className={`${base} bg-white`}>Belum dikerjakan</span>;
  return <span className={`${base} bg-white`}>Kerjakan subtest terakhir</span>;
}

function MulaiButton({ status }: { status: string }) {
  if (status === "selesai") return <div />;
  const isHighlight = status === "belum";
  return (
    <button
      className={`w-full py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
        ${isHighlight ? "bg-[#1A3FA8] text-white" : "bg-neutral-200 text-[#333]"}`}
    >
      Mulai Kerjakan
    </button>
  );
} 

export default function ActivitySection({
  score,
  tryoutStatus,
}: {
  score: any;
  tryoutStatus: string;
}) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100">
        
        <div className="flex items-center gap-2 px-6 h-16 bg-neutral-200">
          <FileText size={16} className="text-[#6E97F2]" />
          <span className="font-semibold text-[#333] text-base">Aktivitas</span>
        </div>

        <div className="grid grid-cols-[1fr_120px_200px_200px] gap-4 px-6 py-3 border-b border-neutral-100 text-sm text-[#333] font-medium">
          <span>Subtest</span>
          <span>Skor</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>

        {subtests.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_120px_200px_200px] gap-4 items-center px-6 py-4 border-b border-neutral-100 last:border-0"
          >
            <span className="text-sm text-[#333]">{item.name}</span>
            <span className="text-sm text-[#333]">{item.skor}</span>
            <StatusBadge status={item.status} />
            <MulaiButton status={item.status} />
          </div>
        ))}
      </div>
    );
  }