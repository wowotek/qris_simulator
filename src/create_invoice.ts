import { Request, Response, NextFunction } from "express";
import getConfiguration, { getConfigurationSync } from "./config";
import crypto from "crypto";
import QRCode from "qrcode";

const NMID = `ID${Math.floor((Math.random() * 8999999999999) + 1000000000001)}`;
const Invoices = new Map<string, Invoice>();
class Invoice {
    private _id: string;
    private _token: string;
    private _number: string;
    private _amount: number;
    private _qrcode: string;
    private _requestDate: Date;
    private _expiredDate: Date;
    private _isPaid: boolean;

    private _customerName: string = "";
    private _paymentMethodBy: string = "";
    constructor(number: string, amount: number) {
        this._id = Math.floor(Math.random() * 999999999).toString();
        this._number = number;
        this._amount = amount;
        this._requestDate = new Date();
        this._isPaid = false;
        
        const dt = new Date(this._requestDate);
        dt.setMinutes(this.requestDate.getMinutes() + 30);
        this._expiredDate = dt;
        
        this._token = crypto.pbkdf2Sync(
            this._id + this._number + this.requestDate.toISOString() + this.expiredDate.toISOString(),
            crypto.randomBytes(1024), Math.ceil(Math.random() * 10000), 32, "sha512"
        ).toString("hex");
        
        const config = getConfigurationSync();
        this._qrcode = `http://${config.hostname}:${config.port}/mp?t=${this._token}`

        Invoices.set(number, this);
    }

    public get id() { return this._id };
    public get number() { return this._number };
    public get amount() { return this._amount };
    public get qrcode() { return this._qrcode };
    public get requestDate() { return this._requestDate };
    public get expiredDate() { return this._expiredDate };
    public get isPaid() { return this._isPaid };
    public get customerName() { return this._customerName };
    public get paymentMethodBy() { return this._paymentMethodBy };
    public get isExpired() {
        return new Date().getTime() > this.expiredDate.getTime()
    }
    public get isValid() {
        if(this.isPaid) return true;
        return !this.isExpired;
    }

    public pay(customerName: string | undefined = undefined, paymentMethod: string | undefined = undefined) {
        if(this.isExpired) return false;

        let firstname = [
            "Aaron", "Agus", "Ali", "Akihiro", "Aoki", "Airlangga", "Arman", "Armando",
            "Brian", "Bagas", "Bagus",
            "Cahyo", "Chandra",
            "Diki", "Dono", "Desi", "Dina", "Doni", "Deden",
            "Erlangga", "Estiana", "Esti", "Efra", "Estes", "Eihaku",
            "Fahmi", "Fikri", "Firanda", "Felando",
            "Gabriele", "Gadis", "Gatot", "Gesang",
            "Helmi", "Heri", "Heru", "Helsing",
            "Indah", "Intan", "Ilang",
            "Joko", "Jabar", "Jenteng", "Jaya", "Jhoyo", "Jetes",
            "Kembar", "Komi", "Kerala",
            "Lala", "Lambe", "Lina", "Lyani", "Lansya",
            "Mamake", "Monda", "Monte", "Masagu", "Mamte",
            "Ontende", "Orinda", "Osiga", "Ookami",
        ];
        let fnI = Math.floor(Math.random() * firstname.length);
        let fn = firstname[fnI];

        let lastname = [
            "Azka", "Ashiko", "Adhi", "Alaihim",
            "Berputra", "Besar", "Batubara",
            "Chandrasiar", "Chokrobuana", "Cakrandibandiga",
            "Delanggu", "Derihian", "Desigintar",
            "Eiharo", "Ekanto", "Empubrahma",
            "Fahmianto", "Fikrianty", "Firmansyah", "Feskundo",
            "Gabimaskur", "Gadungis", "Guntot", "Gersang",
            "Hebring", "Hilmiah", "Herunda", "Herinsyah", "Halhala",
            "Imprintanti", "Ilangnihguys", "Intania",
            "Jabaryah", "Jantungan", "Jayapura", "Jetesindong", "Jokobodo",
            "Wi", "Kaito", "Widodo"
        ]
        let lnI = Math.floor(Math.random() * lastname.length);
        let ln = lastname[lnI];
        this._customerName = customerName ? customerName : `${fn} ${ln}`;
        
        if(paymentMethod == "" || paymentMethod == " " || paymentMethod == null || paymentMethod == undefined) {
            let choices = ["ShopeePay", "LivinByMandiri", "Blu", "DANA", "LinkAja", "OVO", "GOPAY"];
            let index = Math.floor(Math.random() * choices.length);
            
            this._paymentMethodBy = choices[index];
        } else {
            this._paymentMethodBy = paymentMethod;
        }

        return true;
    }

    public static userTransactionNumberIsExist(transactionNumber: string) {
        for(const [trxNum, _] of Array.from(Invoices.entries())) {
            if(transactionNumber == trxNum) return true;
        }
        return false;
    }
}

let config: {
    apiKey: string;
    mID: number;
    port: number;
    hostname: string;
} | null = null;

export async function mixins_checkInvoice(req: Request, res: Response, next: NextFunction) {
    if(config == null) config = await getConfiguration();

    const _invid: string | null | undefined = req.query.mID as string | undefined | null;
    const _trxvalue: string | null | undefined = req.query.mID as string | undefined | null;
    const _trxdate: string | null | undefined = req.query.mID as string | undefined | null;

    const __fieldcheck = [
        _invid, _trxvalue, _trxdate
    ];

    if(__fieldcheck.includes(null) || __fieldcheck.includes(undefined) || __fieldcheck.includes("") || __fieldcheck.includes(" ") || __fieldcheck.includes("0")) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "mandatory parameter is not valid" 
        }
    });

    let foundInvoice: null | Invoice = null;
    for(const [_, invoice] of Array.from(Invoices.entries())) {
        if(invoice.id == _invid) {
            foundInvoice = invoice;
            break
        }
    }
    if(!foundInvoice) return res.status(404).json({
        status: "failed",
        data: {
            qris_status: "invoice not found"
        }
    });
    const dt = new Date(foundInvoice.requestDate);
    dt.setHours(dt.getHours() + 7);
    const dts = (dt.toISOString().replace("T", " ").replace("Z", "").split(".")[0]).split(" ")[0]
    if(dts != _trxdate) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "transaction date invalid"
        }
    });

    if(foundInvoice.amount != parseInt((_trxvalue as string).toString(), 10)) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "invalid invoice amount"
        }
    });

    if(!foundInvoice.isValid) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "invoice already invalid (timeout)"
        }
    });

    if(!foundInvoice.isPaid) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "unpaid"
        }
    });

    return res.status(200).json({
        status: "success",
        data: {
            qris_status: foundInvoice.isPaid ? "paid" : "unpaid",
            qris_payment_customername: foundInvoice.customerName,
            qris_payment_methodby: foundInvoice.paymentMethodBy
        },
        qris_api_version_code: Math.floor(Math.random() * 9999999999).toString()
    })
}

export async function mixins_createInvoice(req: Request, res: Response, next: NextFunction)  {
    if(config == null) config = await getConfiguration();

    const _cliTrxNumber: string | null | undefined = req.query.cliTrxNumber as string | undefined | null;
    const _cliTrxAmount: string | null | undefined = req.query.cliTrxAmount as string | undefined | null;

    const __fieldcheck = [
        _cliTrxNumber, _cliTrxAmount,
    ];

    if(__fieldcheck.includes(null) || __fieldcheck.includes(undefined)) return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "mandatory parameter is not valid" 
        }
    });

    if(_cliTrxNumber as string == "" || _cliTrxNumber as string == " ")  return res.status(400).json({
        status: "failed",
        data: {
            qris_status: "transcation number is empty" 
        }
    });

    if(Invoice.userTransactionNumberIsExist(_cliTrxNumber as string)) return res.status(400).json({
        status: "invalid_request",
        data: {
            qris_status: "cliTrxNumber already used before ! (what we do for you?)"
        }
    });

    const parsedAmount = parseInt(_cliTrxAmount as string)
    if(parsedAmount < 10_000 || parsedAmount > 2_000_000) return res.status(400).json({
        status: "invalid_request",
        data: {
            qris_status: "invalid amount"
        }
    });

    const invoice = new Invoice(_cliTrxNumber as string, parsedAmount);

    const rd = new Date(invoice.requestDate);
    rd.setHours(rd.getHours() + 7);

    const qr = (await QRCode.toBuffer(invoice.qrcode, { errorCorrectionLevel: "H", maskPattern: 7 })).toString("base64")
    console.log(await QRCode.toString(invoice.qrcode, { errorCorrectionLevel: "H", maskPattern: 7 }));
    res.status(200).json({
        status: "success",
        data: {
            qris_content: qr,
            qris_request_date: rd.toISOString().replace("T", " ").replace("Z", "").split(".")[0],
            qris_invoiceid: invoice.id,
            qris_nmid: NMID
        }
    });

    next();
}