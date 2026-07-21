import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceClock } from "@/components/AttendanceClock";

export default async function AttendancePage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  // Compute start of day in local/Manila time offset
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  const today = new Date(`${localIso}T00:00:00.000Z`);

  const todayRecord = userId
    ? await prisma.attendance.findFirst({
        where: { userId, date: today },
      })
    : null;

  return (
    <div className="space-y-6">
      <AttendanceClock initialRecord={JSON.parse(JSON.stringify(todayRecord))} />
    </div>
  );
}
