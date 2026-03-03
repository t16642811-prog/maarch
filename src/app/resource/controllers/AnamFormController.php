<?php

/**
 * Copyright Maarch since 2008 under licence GPLv3.
 * See LICENCE.txt file at the root folder for more details.
 * This file is part of Maarch software.
 *
 */

/**
 * @brief ANAM Instruction Form PDF Controller
 * @author dev@maarch.org
 */

namespace Resource\controllers;

use Contact\controllers\ContactController;
use DateTime;
use Resource\models\ResModel;
use Respect\Validation\Validator;
use setasign\Fpdi\Tcpdf\Fpdi;
use Slim\Psr7\Request;
use SrcCore\controllers\LogsController;
use SrcCore\http\Response;

class AnamFormController
{
    /**
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     * @throws \Exception
     */
    public function getPdf(Request $request, Response $response, array $args): Response
    {
        try {
            if (
                !Validator::intVal()->validate($args['resId']) ||
                !ResController::hasRightByResId(['resId' => [$args['resId']], 'userId' => $GLOBALS['id']])
            ) {
                return $response->withStatus(403)->withJson(['errors' => 'Document out of perimeter']);
            }

            $resource = ResModel::getById([
                'select' => [
                    'subject',
                    'doc_date',
                    'admission_date',
                    'creation_date',
                    'alt_identifier',
                    'custom_fields'
                ],
                'resId'  => $args['resId']
            ]);

            if (empty($resource)) {
                return $response->withStatus(400)->withJson(['errors' => 'Document does not exist']);
            }

            $templatePath = 'C:\\Users\\dell\\Desktop\\maaaaaaarch\\courrier.pdf';
            if (!is_file($templatePath)) {
                return $response->withStatus(400)->withJson(['errors' => 'Template file not found']);
            }

            /** @var array<string, mixed> $customFields */
            $customFields = !empty($resource['custom_fields']) ? json_decode($resource['custom_fields'], true) : [];
            /**
             * @param array<string, mixed> $customFields
             * @param mixed $default
             * @return mixed
             */
            $getCustomValue = static function (array $customFields, int $id, $default = '') {
                return $customFields[(string)$id] ?? $default;
            };

            $senders = ContactController::getFormattedContacts([
                'resId'       => $args['resId'],
                'mode'        => 'sender',
                'onlyContact' => true
            ]);
            $senderLabel = $senders[0] ?? '';

            $modeReception = $getCustomValue($customFields, 6, '');
            $bog = $getCustomValue($customFields, 7, '');
            $mem = $getCustomValue($customFields, 8, '');
            $sg = $getCustomValue($customFields, 9, '');
            $cc = $getCustomValue($customFields, 10, '');
            $dgm = $getCustomValue($customFields, 11, '');

            /** @var array<int, string> $destExec */
            $destExec = (array)$getCustomValue($customFields, 12, []);
            /** @var array<int, string> $destFollow */
            $destFollow = (array)$getCustomValue($customFields, 13, []);
            /** @var array<int, string> $destInfo */
            $destInfo = (array)$getCustomValue($customFields, 14, []);

            $instructionsPcd = $getCustomValue($customFields, 15, '');
            $classement = $getCustomValue($customFields, 16, '');
            $reference = $getCustomValue($customFields, 17, '');
            $referenceDate = $getCustomValue($customFields, 18, '');
            $instructionsStructure = $getCustomValue($customFields, 19, '');

            $dateReception = $resource['admission_date'] ?? $resource['creation_date'] ?? null;
            $dateReception = !empty($dateReception) ? (new DateTime($dateReception))->format('d/m/Y H:i') : '';
            $docDate = !empty($resource['doc_date']) ? (new DateTime($resource['doc_date']))->format('d/m/Y') : '';

            $destColumns = ['Recherche', 'Promotion', 'Permis miniers', 'Controle minier', 'DRHL', 'DFC', 'Dcx'];

            $pdf = new Fpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetAutoPageBreak(false);
            $pdf->setSourceFile($templatePath);
            $tplIdx = $pdf->importPage(1);
            $size = $pdf->getTemplateSize($tplIdx);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useImportedPage($tplIdx);

            $queryParams = $request->getQueryParams();
            $debug = !empty($queryParams['debug']);

            $pdf->SetFont('helvetica', '', 9);

            // Template is now blank, no need to mask example text.

            // Numero / Date & heure (left box)
            $pdf->SetXY(25, 60.1);
            $pdf->Cell(85, 4.5, (string)$resource['alt_identifier'], 0, 0);
            $pdf->SetXY(31.9, 66.2);
            $pdf->Cell(95, 4.5, $dateReception, 0, 0);

            // Expediteur
            $pdf->SetXY(30, 80.6);
            $pdf->Cell(155, 4.5, $senderLabel, 0, 0);

            // Objet
            $pdf->SetXY(20, 99.6);
            $pdf->MultiCell(172, 4.8, $resource['subject'] ?? '', 0, 'L');

            // N° et date fields (right block)
            $fieldX = 154;
            $fieldY = 34.5;
            $lineGap = 6.1;

            foreach ([$bog, $mem, $sg, $cc, $dgm] as $value) {
                $pdf->SetXY($fieldX, $fieldY);
                $pdf->Cell(60, 5, (string)$value, 0, 0);
                $fieldY += $lineGap;
            }

            // Mode de reception checkboxes
            $checkboxY = 72;
            $checkboxesX = [132, 150.5, 170, 193.2];
            $modes = ['B.O.G', 'F.A.X', 'Mail', 'Inter'];
            foreach ($modes as $idx => $mode) {
                if ($modeReception === $mode) {
                    $pdf->SetXY($checkboxesX[$idx], $checkboxY);
                    $pdf->Cell(4, 4, 'X', 0, 0);
                }
            }

            // Destinataires grid checkboxes (pixel-perfect positions)
            $rows = [$destExec, $destFollow, $destInfo];
            $rowPositions = [133, 140, 147];
            $columnPositions = [
                'Recherche'       => 50,
                'Promotion'       => 77,
                'Permis miniers'  => 106,
                'Controle minier' => 136,
                'DRHL'            => 160,
                'DFC'             => 176,
                'Dcx'             => 192.5
            ];
            foreach ($rows as $rowIndex => $rowValues) {
                $rowY = $rowPositions[$rowIndex] ?? null;
                if ($rowY === null) {
                    continue;
                }
                foreach ($destColumns as $col) {
                    if (!in_array($col, $rowValues, true)) {
                        continue;
                    }
                    $colX = $columnPositions[$col] ?? null;
                    if ($colX === null) {
                        continue;
                    }
                    $pdf->SetXY($colX, $rowY);
                    $pdf->Cell(4, 4, 'X', 0, 0);
                }
            }

            // Instructions / Classement
            $wrapText = static function (Fpdi $pdf, string $text, float $width): array {
                $lines = [];
                $paragraphs = preg_split("/\\r\\n|\\r|\\n/", $text);
                foreach ($paragraphs as $paragraph) {
                    $paragraph = trim($paragraph);
                    if ($paragraph === '') {
                        $lines[] = '';
                        continue;
                    }
                    $words = preg_split('/\\s+/', $paragraph);
                    $line = '';
                    foreach ($words as $word) {
                        $test = $line === '' ? $word : $line . ' ' . $word;
                        if ($pdf->GetStringWidth($test) <= $width) {
                            $line = $test;
                        } else {
                            if ($line !== '') {
                                $lines[] = $line;
                            }
                            $line = $word;
                        }
                    }
                    if ($line !== '') {
                        $lines[] = $line;
                    }
                }
                return $lines;
            };

            $pcdX = 9;
            $pcdY = 163;
            $pcdW = 65;
            $pcdLineHeight = 6.1;
            $pdf->setCellHeightRatio(1);
            $pdf->setCellPaddings(0, 0, 0, 0);
            $pcdLines = $wrapText($pdf, (string)$instructionsPcd, $pcdW);
            foreach ($pcdLines as $index => $line) {
                $pdf->SetXY($pcdX, $pcdY + ($index * $pcdLineHeight));
                $pdf->Cell($pcdW, $pcdLineHeight, $line, 0, 0);
            }
            $pdf->setCellHeightRatio(1.25);
            $pdf->SetXY(115, 186);
            $pdf->MultiCell(80, 4.2, $classement, 0, 'L');

            // Reference / Date
            $pdf->SetXY(125, 228);
            $pdf->Cell(40, 5, $reference, 0, 0);
            $refDate = !empty($referenceDate) ? (new DateTime($referenceDate))->format('d/m/Y') : '';
            $pdf->SetXY(175, 228);
            $pdf->Cell(25, 5, $refDate, 0, 0);

            // Instructions structure
            $pdf->SetXY(115, 242);
            $pdf->MultiCell(80, 4.2, $instructionsStructure, 0, 'L');

            // Date du courrier
            $pdf->SetXY(10, 286);
            $pdf->Cell(60, 4, $docDate, 0, 0);

            if ($debug) {
                $pdf->SetDrawColor(200, 200, 200);
                $pdf->SetTextColor(120, 120, 120);
                $pdf->SetFont('helvetica', '', 6);
                $step = 10;
                for ($x = 0; $x <= $size['width']; $x += $step) {
                    $pdf->Line($x, 0, $x, $size['height']);
                    $pdf->SetXY($x + 0.5, 1);
                    $pdf->Cell(0, 2, (string)$x, 0, 0);
                }
                for ($y = 0; $y <= $size['height']; $y += $step) {
                    $pdf->Line(0, $y, $size['width'], $y);
                    $pdf->SetXY(1, $y + 0.5);
                    $pdf->Cell(0, 2, (string)$y, 0, 0);
                }
                $pdf->SetTextColor(255, 0, 0);
                $pdf->SetFont('helvetica', 'B', 7);
                $markers = [
                    ['N', 25, 60.1],
                    ['D', 31.9, 66.25],
                    ['E', 30, 80.8],
                    ['O', 20, 99.6],
                    ['B', 154, 34.5],
                    ['C', 132, 72],
                    ['G', 50, 133],
                    ['I', 10, 164],
                    ['R', 142, 188.5],
                    ['S', 117, 195],
                    ['T', 100,164.3],
                    ['F', 50, 140],
                    ['L', 50, 147],
                    ['U', 77, 133],
                    ['A', 106, 133],
                    ['W', 136, 133],
                    ['X', 160, 133],
                    ['Y', 176, 133],
                    ['Z', 192.5, 133],
                    ['J', 8, 183],
                    ['K', 8, 189],
                    ['M', 8, 195],
                    ['Q', 8, 177],
                    ['V', 8, 171],
                    ['H', 72, 164],
                    ['P', 142, 164],
                    ['Q', 142, 188.5],
                    ['1', 8, 202],
                    ['2', 8, 208],
                    ['3', 8, 214.5],
                    ['4', 8, 221],
                    ['5', 8, 227.5],
                    ['6', 8, 234],
                    ['7', 8, 240.5],
                    ['8', 8, 247],

                ];
                foreach ($markers as $m) {
                    $pdf->SetXY($m[1], $m[2]);
                    $pdf->Cell(6, 4, $m[0], 0, 0);
                }
            }

            $fileContent = $pdf->Output('', 'S');
            $response->write($fileContent);
            $response = $response->withAddedHeader(
                'Content-Disposition',
                "attachment; filename=fiche_courrier_arrivee_{$args['resId']}.pdf"
            );
            return $response->withHeader('Content-Type', 'application/pdf');
        } catch (\Throwable $e) {
            $line = "[anamFormPdf] " . $e->getMessage() . PHP_EOL;
            @file_put_contents('technique.log', $line, FILE_APPEND);
            error_log($line);
            try {
                LogsController::add([
                    'level'   => 'error',
                    'module'  => 'resource',
                    'eventId' => 'anamFormPdf',
                    'desc'    => $e->getMessage()
                ]);
            } catch (\Throwable $logError) {
                @file_put_contents('technique.log', "[anamFormPdf-log] " . $logError->getMessage() . PHP_EOL, FILE_APPEND);
            }
            return $response->withStatus(500)->withJson(['errors' => $e->getMessage()]);
        }
    }
}
