# Diccionario de traducción de clases COCO al español
COCO_TRANSLATIONS = {
    "person": "Persona",
    "bicycle": "Bicicleta",
    "car": "Automóvil",
    "motorcycle": "Motocicleta",
    "airplane": "Avión",
    "bus": "Autobús",
    "train": "Tren",
    "truck": "Camión",
    "boat": "Bote",
    "traffic light": "Semáforo",
    "fire hydrant": "Hidrante",
    "stop sign": "Señal de Stop",
    "parking meter": "Parquímetro",
    "bench": "Banco urbano",
    "bird": "Pájaro",
    "cat": "Gato",
    "dog": "Perro",
    "horse": "Caballo",
    "sheep": "Oveja",
    "cow": "Vaca",
    "chair": "Silla",
    "couch": "Sofá / Mueble en vía",
    "potted plant": "Planta",
    "bed": "Cama",
    "dining table": "Mesa",
    "bottle": "Botella / Desecho",
    "teddy bear": "Oso de peluche",
    "backpack": "Mochila",
    "umbrella": "Paraguas",
    "cell phone": "Teléfono celular",
    "pothole": "Bache en calzada",
    "trash": "Basura acumulada",
}

def translate_label(label: str) -> str:
    return COCO_TRANSLATIONS.get(label.lower().strip(), label)

