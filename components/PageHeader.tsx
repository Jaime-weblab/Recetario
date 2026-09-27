// Cabecera sencilla con el título de cada pantalla.
export default function PageHeader({ title }: { title: string }) {
  return <h1 className="border-b border-line pb-3 pt-6 font-serif text-3xl">{title}</h1>;
}
