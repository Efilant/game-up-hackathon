from pathlib import Path
import struct

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt


ROOT = Path('/Users/elif/felaket_benim')
TEMPLATE = Path('/Users/elif/Downloads/Oyun Hackathonu Sunum Şablonu (1).pptx')
OUT = ROOT / 'Sehrin_Yarini_Hackathon_Sunumu.pptx'

LOGO = ROOT / 'public/assets/branding/sehrin-yarini-logo.png'
SHOT_MENU = ROOT / 'qa-final/screenshots/branding-menu-desktop.png'
SHOT_HOSPITAL = ROOT / 'qa-final/screenshots/district_hillside_hospital.png'
SHOT_HARBOR = ROOT / 'qa-final/screenshots/district_coastal_harbor.png'
SHOT_INDUSTRIAL = ROOT / 'qa-final/screenshots/district_industrial.png'
SHOT_TRANSITIONS = ROOT / 'qa-final/screenshots/district_transitions.png'
SHOT_RECOVERY = ROOT / 'qa-final/screenshots/sponge-recovery.png'
SHOT_CHAPTERS = ROOT / 'qa-final/screenshots/branding-chapters-desktop.png'
VIDEO = ROOT / 'release-qa/videos/visual-acceptance-gameplay.webm'

INK = RGBColor(0x19, 0x1B, 0x2A)


def png_size(path: Path):
    with path.open('rb') as f:
        sig = f.read(24)
    if sig[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Only PNG assets are supported: {path}')
    return struct.unpack('>II', sig[16:24])


def remove_shape(shape):
    shape._element.getparent().remove(shape._element)


def replace_picture(slide, old_shape, path: Path):
    """Replace an image while preserving its original z-order and box."""
    sp_tree = slide.shapes._spTree
    old_element = old_shape._element
    old_index = list(sp_tree).index(old_element)
    left, top, width, height = old_shape.left, old_shape.top, old_shape.width, old_shape.height
    remove_shape(old_shape)
    pic = slide.shapes.add_picture(str(path), left, top, width=width, height=height)
    pic_el = pic._element
    sp_tree.remove(pic_el)
    sp_tree.insert(old_index, pic_el)
    # Crop to fill without distorting screenshots.
    iw, ih = png_size(path)
    image_ratio = iw / ih
    box_ratio = width / height
    if image_ratio > box_ratio:
        crop = (1 - box_ratio / image_ratio) / 2
        pic.crop_left = crop
        pic.crop_right = crop
    elif image_ratio < box_ratio:
        crop = (1 - image_ratio / box_ratio) / 2
        pic.crop_top = crop
        pic.crop_bottom = crop
    return pic


def add_picture_cover(slide, path: Path, left, top, width, height):
    pic = slide.shapes.add_picture(str(path), left, top, width=width, height=height)
    iw, ih = png_size(path)
    image_ratio = iw / ih
    box_ratio = width / height
    if image_ratio > box_ratio:
        crop = (1 - box_ratio / image_ratio) / 2
        pic.crop_left = crop
        pic.crop_right = crop
    elif image_ratio < box_ratio:
        crop = (1 - image_ratio / box_ratio) / 2
        pic.crop_top = crop
        pic.crop_bottom = crop
    return pic


def style_run(run, size, bold=False, color=INK):
    run.font.name = 'Arial'
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def set_text(shape, text, size, bold=False, align=None, color=INK):
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    lines = text.split('\n')
    for index, line in enumerate(lines):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.text = ''
        p.space_after = Pt(2)
        if align is not None:
            p.alignment = align
        run = p.add_run()
        run.text = line
        style_run(run, size, bold=bold, color=color)
    return shape


def add_textbox(slide, left, top, width, height, text, size=18, bold=False, align=None):
    box = slide.shapes.add_textbox(left, top, width, height)
    set_text(box, text, size, bold=bold, align=align)
    return box


def set_linked_lines(shape, lines, size=18):
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    for index, (label, address) in enumerate(lines):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.text = ''
        p.space_after = Pt(8)
        run = p.add_run()
        run.text = label
        style_run(run, size, color=INK)
        if address:
            run.hyperlink.address = address


def main():
    prs = Presentation(str(TEMPLATE))
    slides = prs.slides

    # Slide 1: cover. Keep the template's heading and program logo band.
    slide = slides[0]
    set_text(slide.shapes[0], 'Şehrin Yarını', 40, bold=True, align=PP_ALIGN.CENTER)
    set_text(
        slide.shapes[1],
        'Oyuncunun iklim çözümlerini araştırıp seçtiği, sel dayanıklılığı temalı mobil strateji oyunu.',
        20,
        align=PP_ALIGN.CENTER,
    )
    replace_picture(slide, slide.shapes[3], LOGO)

    # Slide 2: focus theme.
    slide = slides[1]
    set_text(
        slide.shapes[1],
        'İklim uyumu ve afetlere dayanıklılık\n\nSel riskine karşı çözüm seçimi\nYerel sağlık, ulaşım ve mahalle güvenliği\nKararın simülasyon sonucuna etkisi',
        19,
        bold=False,
    )
    replace_picture(slide, slide.shapes[3], SHOT_HOSPITAL)

    # Slide 3: story.
    slide = slides[2]
    set_text(
        slide.shapes[1],
        'Şiddetli bir fırtınanın eşiğindeki kentte oyuncu, şehri koruma planını hazırlayan karar verici rolünü üstlenir.\n\nMira’nın rehberliğiyle sahaları keşfeder, çözümleri araştırır ve 100 Kr bütçeyi aşmadan bir plan kurar. Fırtına başladığında amaç, hastane yolunu açık tutarak kentin yaşamını sürdürmektir.',
        17,
    )
    replace_picture(slide, slide.shapes[3], SHOT_RECOVERY)

    # Slide 4: genre and differentiator.
    slide = slides[3]
    set_text(
        slide.shapes[1],
        'Mobil keşif ve strateji simülasyonu\n\nOyuncu dört iklim çözümünü sahada keşfeder, maliyet ve etki alanlarını karşılaştırır. Özgün tarafı, tek bir doğru yerine bütçeye ve hedef bölgeye göre kurulan planın fırtına sonucunu belirlemesidir.',
        18,
    )
    replace_picture(slide, slide.shapes[3], SHOT_TRANSITIONS)

    # Slide 5: gameplay video poster and the local WebM reference.
    slide = slides[4]
    remove_shape(slide.shapes[3])
    replace_picture(slide, slide.shapes[2], SHOT_RECOVERY)
    caption = add_textbox(
        slide,
        Inches(1.25), Inches(5.95), Inches(10.8), Inches(0.55),
        'Kısa oynanış kaydı: visual-acceptance-gameplay.webm  |  Akış: keşif, çözüm günlüğü, bütçe planı, fırtına sonucu',
        15,
        align=PP_ALIGN.CENTER,
    )
    caption.text_frame.paragraphs[0].runs[0].hyperlink.address = VIDEO.as_uri()

    # Slide 6: scenes. Replace the template illustration with three real game captures.
    slide = slides[5]
    set_text(
        slide.shapes[1],
        'Gerçek oynanıştan kareler\n\nFırtına öncesi keşif\nÇözüm günlüğünde karşılaştırma\nPlan onayı ve sel sonrası değerlendirme',
        18,
    )
    remove_shape(slide.shapes[3])
    add_picture_cover(slide, SHOT_MENU, Inches(3.05), Inches(1.9), Inches(3.0), Inches(2.25))
    add_picture_cover(slide, SHOT_HARBOR, Inches(6.35), Inches(1.9), Inches(3.0), Inches(2.25))
    add_picture_cover(slide, SHOT_RECOVERY, Inches(9.65), Inches(1.9), Inches(3.0), Inches(2.25))
    add_textbox(slide, Inches(3.05), Inches(4.3), Inches(3.0), Inches(0.35), 'Keşif', 14, bold=True, align=PP_ALIGN.CENTER)
    add_textbox(slide, Inches(6.35), Inches(4.3), Inches(3.0), Inches(0.35), 'Bölge ve risk', 14, bold=True, align=PP_ALIGN.CENTER)
    add_textbox(slide, Inches(9.65), Inches(4.3), Inches(3.0), Inches(0.35), 'Sonuç', 14, bold=True, align=PP_ALIGN.CENTER)

    # Slide 7: individual team page. Remove unused team placeholders and keep one clear profile.
    slide = slides[6]
    for index in sorted([0, 1, 2, 3], reverse=True):
        remove_shape(slide.shapes[index])
    for shape in list(slide.shapes):
        if hasattr(shape, 'text') and shape.text.strip() in {'Ad Soyad', 'Görevi'}:
            remove_shape(shape)
    add_picture_cover(slide, LOGO, Inches(0.84), Inches(1.82), Inches(2.2), Inches(2.2))
    add_textbox(slide, Inches(3.25), Inches(1.85), Inches(4.6), Inches(0.55), 'Elif Altun', 26, bold=True)
    add_textbox(slide, Inches(3.25), Inches(2.45), Inches(5.0), Inches(0.5), 'Bireysel ekip · oyun geliştirici', 18)
    add_textbox(slide, Inches(3.25), Inches(3.15), Inches(5.5), Inches(0.65), 'Kocaeli Üniversitesi\nYazılım Mühendisliği Öğrencisi', 20, bold=True)
    add_textbox(slide, Inches(3.25), Inches(4.25), Inches(5.7), Inches(1.05), 'Proje kapsamı\nOyun tasarımı, geliştirme, görsel yön ve test süreci', 17)

    # Slide 8: future plan.
    slide = slides[7]
    set_text(
        slide.shapes[2],
        'Kısa vade\nMobil dokunmatik E2E ve görev akışının tamamlanması\n\nOrta vade\nÇözüm kombinasyonlarının gerçek fırtına sonuçlarıyla test edilmesi\n\nSonraki sürüm\n9 adımlı görev migrasyonu, yeni bölümler ve genişleyen şehir hikâyesi',
        17,
    )
    replace_picture(slide, slide.shapes[1], SHOT_CHAPTERS)

    # Slide 9: links. Use existing source repository and the local video file; leave demo hosting honest.
    slide = slides[8]
    set_linked_lines(
        slide.shapes[2],
        [
            ('Kaynak kodu: github.com/Efilant/game-up-hackathon', 'https://github.com/Efilant/game-up-hackathon'),
            ('Oynanış videosu: visual-acceptance-gameplay.webm', VIDEO.as_uri()),
            ('Proje raporu: PLAYER_CHOICE_OVERHAUL_REPORT.md', (ROOT / 'PLAYER_CHOICE_OVERHAUL_REPORT.md').as_uri()),
            ('Demo: yerel build / paylaşım bağlantısı eklenecek', None),
        ],
        size=17,
    )
    replace_picture(slide, slide.shapes[3], SHOT_MENU)

    # Slide 10: presenter. Keep the GameUp logo and template title area; do not invent an email.
    slide = slides[9]
    set_text(slide.shapes[0], 'Elif Altun', 34, bold=True, align=PP_ALIGN.CENTER)
    set_text(slide.shapes[1], 'Bireysel ekip · oyun geliştirici', 20)
    set_text(slide.shapes[3], 'E-posta adresi eklenecek', 18)
    replace_picture(slide, slide.shapes[5], LOGO)

    prs.save(str(OUT))
    print(OUT)


if __name__ == '__main__':
    main()
