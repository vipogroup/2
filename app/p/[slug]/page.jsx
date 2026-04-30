
import { getDb } from "@/lib/db";
import Link from "next/link";

function Progress({ joined, target }){
  const pct = Math.min(100, Math.round((joined/Math.max(target,1))*100));
  return (
    <div>
      <div className="progress mb-2"><span style={{width: pct+'%'}}></span></div>
      <div className="text-sm text-gray-600">{joined} / {target} הצטרפו</div>
    </div>
  );
}

export default async function ProductPage({ params, searchParams }){
  const db = await getDb();
  const p = await db.collection("products").findOne({ slug: params.slug });
  if (!p) return <main>מוצר לא נמצא</main>;

  const isGroup = !!p.isGroupBuy;
  const joined = p.groupJoined || 0;
  const target = p.groupTarget || 0;

  return (
    <main className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 card">
        <h1 className="text-2xl font-bold mb-2">{p.title}</h1>
        <p className="mb-4">{isGroup ? "יבוא קבוצתי במחיר מפעל" : "מוצר זמין לרכישה מיידית"}</p>

        {isGroup && (
          <div className="mb-4">
            <Progress joined={joined} target={target} />
            <p className="text-sm text-gray-700 mt-2">
              דמי רצינות: {Math.round((p.groupDepositPercent||0.1)*100)}%
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="card">גלריית תמונות (להשלים)</div>
          <div className="card">מפרט טכני (להשלים)</div>
        </div>
      </section>

      <aside className="card h-fit">
        <div className="mb-3">
          <div className="text-3xl font-bold">₪{p.salePrice ?? p.price}</div>
          {p.salePrice && <div className="text-sm text-gray-500 line-through">₪{p.price}</div>}
        </div>

        {!isGroup && (
          <Link className="btn w-full" href={`/checkout?slug=${p.slug}`}>הזמנה מאובטחת</Link>
        )}
        {isGroup && (
          <Link className="btn w-full" href={`/group-join?slug=${p.slug}`}>מצטרף עכשיו (דמי רצינות)</Link>
        )}

        <div className="mt-4">
          <a className="btn w-full" href="https://wa.me/0587009938" target="_blank">דברו איתנו בוואטסאפ</a>
        </div>
      </aside>
    </main>
  );
}
