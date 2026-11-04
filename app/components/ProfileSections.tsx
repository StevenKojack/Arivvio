export function ProfileSections({sections}:{sections?:{title:string;body:string}[]}) {
  return <>{sections?.map((s,i)=><section key={i} className="my-5"><h3 className="text-lg font-semibold">{s.title}</h3><p className="mt-2 whitespace-pre-line break-words">{s.body}</p></section>)}</>;
}
